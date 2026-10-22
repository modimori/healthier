"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Languages,
  LoaderCircle,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BrandMark } from "@/components/brand";
import { useHealth, useLocale } from "@/components/providers";
import { calculateHealth } from "@/lib/health";
import { formatNumber } from "@/lib/i18n";

type Phase = "idle" | "thinking";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type DoctorChatProps = {
  promptSeed: { id: number; text: string } | null;
  onPromptConsumed: () => void;
  onOpenCalculator: () => void;
};

type ApiResponse = {
  answer?: string;
  error?: string;
};

const CHAT_API_URL =
  process.env.NEXT_PUBLIC_CHAT_API_URL?.trim() ||
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8787/api/chat"
    : "");

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DoctorChat({
  promptSeed,
  onPromptConsumed,
  onOpenCalculator,
}: DoctorChatProps) {
  const { locale, t } = useLocale();
  const { profile, hasProfile } = useHealth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const consumedSeedRef = useRef<number | null>(null);

  const readout = calculateHealth(profile);
  const isLoading = phase !== "idle";

  const scrollToEnd = useCallback(() => {
    window.requestAnimationFrame(() => {
      scrollEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, phase, scrollToEnd]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isLoading) return;

      if (!CHAT_API_URL) {
        setError(t.doctor.errorUnavailable);
        return;
      }

      const userMessage: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text,
      };
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setInput("");
      setError(null);
      setPhase("thinking");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(CHAT_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            profile: hasProfile ? profile : undefined,
            messages: nextMessages.slice(-12).map(({ role, content }) => ({
              role,
              content,
            })),
          }),
          signal: controller.signal,
        });

        const data = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok || !data.answer) {
          if (
            data.error === "missing_key" ||
            data.error === "forbidden_origin"
          ) {
            setError(t.doctor.errorUnavailable);
          } else {
            setError(t.doctor.errorGeneric);
          }
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: makeId(),
            role: "assistant",
            content: data.answer as string,
          },
        ]);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError(t.doctor.errorGeneric);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setPhase("idle");
      }
    },
    [hasProfile, isLoading, locale, messages, profile, t],
  );

  useEffect(() => {
    if (!promptSeed || promptSeed.id === consumedSeedRef.current) return;
    consumedSeedRef.current = promptSeed.id;
    onPromptConsumed();

    if (promptSeed.text) {
      void sendMessage(promptSeed.text);
    } else {
      inputRef.current?.focus();
    }
  }, [promptSeed, onPromptConsumed, sendMessage]);

  function resetChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setPhase("idle");
    setInput("");
    inputRef.current?.focus();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <div className="page doctor-page">
      <header className="page-heading doctor-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" />
            {t.doctor.eyebrow}
          </p>
          <h1>{t.doctor.title}</h1>
          <p className="page-subtitle">{t.doctor.subtitle}</p>
        </div>
        <button
          type="button"
          className="button button--dark button--small doctor-new-chat"
          onClick={resetChat}
        >
          <Plus size={15} strokeWidth={2} />
          {t.doctor.newChat}
        </button>
      </header>

      <div className="doctor-layout">
        <section className="chat-card" aria-label={t.doctor.title}>
          <header className="chat-card-header">
            <div className="chat-identity">
              <span className="chat-avatar">
                <BrandMark />
              </span>
              <div>
                <strong>{t.doctor.doctorName}</strong>
                <span className="chat-status">
                  <i aria-hidden="true" />
                  {t.doctor.online}
                </span>
              </div>
            </div>
            <span className="chat-powered">{t.doctor.poweredBy}</span>
          </header>

          <div className="chat-scroll" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <span className="welcome-mark">
                  <BrandMark />
                </span>
                <h2>{t.doctor.welcomeTitle}</h2>
                <p>{t.doctor.welcomeBody}</p>
                <div className="welcome-suggestions">
                  <span className="welcome-suggestions-label">
                    {t.doctor.suggestionsTitle}
                  </span>
                  {t.doctor.suggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => void sendMessage(suggestion)}
                      className="welcome-suggestion"
                    >
                      <span>{suggestion}</span>
                      <ArrowUpRight size={15} strokeWidth={1.8} />
                    </button>
                  ))}
                </div>
                <div className="welcome-note">
                  <ShieldCheck size={15} strokeWidth={1.8} />
                  <span>{t.doctor.disclaimer}</span>
                </div>
              </div>
            )}

            {messages.map((message) =>
              message.role === "user" ? (
                <div className="message message--user" key={message.id}>
                  <span className="message-sender">{t.doctor.you}</span>
                  <div className="user-bubble" dir="auto">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="message message--assistant" key={message.id}>
                  <span className="message-avatar">
                    <BrandMark />
                  </span>
                  <div className="assistant-message">
                    <div className="message-meta">
                      <strong>{t.doctor.doctorName}</strong>
                    </div>
                    <div className="assistant-bubble markdown" dir="auto">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ),
            )}

            {isLoading && (
              <div className="message message--assistant">
                <span className="message-avatar">
                  <BrandMark />
                </span>
                <div className="assistant-message">
                  <div className="message-meta">
                    <strong>{t.doctor.doctorName}</strong>
                  </div>
                  <div className="thinking-bubble">
                    <span className="thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>{t.doctor.thinking}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {error && (
            <div className="chat-error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label={t.common.close}
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          )}

          <div className="composer-wrap">
            <form className="composer" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.doctor.placeholder}
                maxLength={2000}
                disabled={isLoading}
                aria-label={t.doctor.placeholder}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!input.trim() || isLoading}
                aria-label={t.doctor.send}
              >
                {isLoading ? (
                  <LoaderCircle
                    size={18}
                    strokeWidth={2}
                    className="spin"
                  />
                ) : (
                  <ArrowUp size={19} strokeWidth={2.1} />
                )}
              </button>
            </form>
            <div className="composer-meta">
              <span>{t.doctor.privacy}</span>
              <span>{t.doctor.disclaimer}</span>
            </div>
          </div>
        </section>

        <aside className="chat-aside">
          <div className="chat-aside-card chat-aside-profile">
            <div className="aside-card-top">
              <p className="card-eyebrow">{t.doctor.asideProfile}</p>
              <button
                type="button"
                className="aside-icon-button"
                onClick={onOpenCalculator}
                aria-label={t.nav.calculator}
              >
                <ArrowUpRight size={15} strokeWidth={1.8} />
              </button>
            </div>
            {hasProfile ? (
              <>
                <h3>{t.doctor.asideNumbers}</h3>
                <div className="aside-metrics">
                  <div>
                    <span>{t.overview.bmi}</span>
                    <strong>{formatNumber(readout.bmi, locale, 1)}</strong>
                  </div>
                  <div>
                    <span>{t.overview.dailyCalories}</span>
                    <strong>
                      {formatNumber(readout.targetCalories, locale)}
                      <i>{t.shell.kcal}</i>
                    </strong>
                  </div>
                  <div>
                    <span>{t.overview.protein}</span>
                    <strong>
                      {formatNumber(readout.macros.protein, locale)}
                      <i>g</i>
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3>{t.overview.setupTitle}</h3>
                <p className="aside-body">{t.overview.setupBody}</p>
                <button
                  type="button"
                  className="button button--dark button--small button--full"
                  onClick={onOpenCalculator}
                >
                  {t.overview.setupCta}
                </button>
              </>
            )}
          </div>

          <div className="chat-aside-card chat-aside-safety">
            <span className="aside-safety-icon">
              <ShieldCheck size={19} strokeWidth={1.7} />
            </span>
            <h3>{t.doctor.asideSafetyTitle}</h3>
            <p>{t.doctor.asideSafetyBody}</p>
          </div>

          <div className="chat-aside-note">
            <Languages size={16} strokeWidth={1.7} />
            <p>{t.doctor.languageNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
