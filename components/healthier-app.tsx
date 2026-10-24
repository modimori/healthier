"use client";

import { useEffect, useState } from "react";
import {
  Calculator as CalculatorIcon,
  LayoutGrid,
  MapPin,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Wordmark } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { CalculatorView } from "@/components/calculator-view";
import { DoctorChat } from "@/components/doctor-chat";
import { NearbyCare } from "@/components/nearby-care";
import { Overview } from "@/components/overview";
import { useHealth, useLocale } from "@/components/providers";
import { calculateHealth } from "@/lib/health";
import { formatDate, formatNumber, type Copy } from "@/lib/i18n";

export type View = "overview" | "doctor" | "calculator" | "nearby";

type PromptSeed = {
  id: number;
  text: string;
};

const NAV_ITEMS = [
  { key: "overview" as const, icon: LayoutGrid },
  { key: "doctor" as const, icon: Stethoscope },
  { key: "calculator" as const, icon: CalculatorIcon },
  { key: "nearby" as const, icon: MapPin },
];

function getNavLabel(t: Copy, view: View): string {
  return t.nav[view];
}

export function HealthierApp() {
  const { locale, t } = useLocale();
  const { profile, hasProfile } = useHealth();
  const [view, setView] = useState<View>("overview");
  const [promptSeed, setPromptSeed] = useState<PromptSeed | null>(null);
  const [today, setToday] = useState("");

  const readout = calculateHealth(profile);

  useEffect(() => {
    setToday(formatDate(new Date(), locale));
  }, [locale]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  function navigate(nextView: View) {
    setView(nextView);
    if (nextView !== "doctor") {
      setPromptSeed(null);
    }
  }

  function askDoctor(prompt?: string) {
    setPromptSeed({
      id: Date.now(),
      text: prompt ?? "",
    });
    setView("doctor");
  }

  function consumePrompt() {
    setPromptSeed(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <button
            type="button"
            className="brand-button"
            onClick={() => navigate("overview")}
            aria-label="Healthier home"
          >
            <Wordmark />
          </button>

          <nav className="side-nav" aria-label="Main navigation">
            <span className="side-nav-label">{t.shell.workspace}</span>
            {NAV_ITEMS.map(({ key, icon: Icon }) => (
              <button
                type="button"
                key={key}
                className={`nav-item${view === key ? " is-active" : ""}`}
                onClick={() => navigate(key)}
                aria-current={view === key ? "page" : undefined}
              >
                <span className="nav-icon">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span>{getNavLabel(t, key)}</span>
                <span className="nav-marker" aria-hidden="true" />
              </button>
            ))}
          </nav>

          <div className="sidebar-rule" />

          {hasProfile ? (
            <button
              type="button"
              className="sidebar-target"
              onClick={() => navigate("calculator")}
            >
              <span className="sidebar-target-eyebrow">
                {t.shell.dailyTarget}
              </span>
              <span className="sidebar-target-value">
                <strong>{formatNumber(readout.targetCalories, locale)}</strong>
                <span>{t.shell.kcal}</span>
              </span>
              <span className="sidebar-target-track">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      (readout.targetCalories / 3200) * 100,
                    )}%`,
                  }}
                />
              </span>
              <span className="sidebar-target-link">{t.nav.calculator}</span>
            </button>
          ) : (
            <button
              type="button"
              className="sidebar-target sidebar-target--empty"
              onClick={() => navigate("calculator")}
            >
              <span className="sidebar-target-eyebrow">
                {t.overview.snapshot}
              </span>
              <strong>{t.overview.setupTitle}</strong>
              <span>{t.overview.setupCta}</span>
            </button>
          )}
        </div>

        <div className="sidebar-bottom">
          <LanguageSwitch inverted />
          <div className="sidebar-profile">
            <span className="avatar avatar--sidebar">
              <UserRound size={16} strokeWidth={1.8} />
            </span>
            <span className="sidebar-profile-copy">
              <strong>{t.shell.profile}</strong>
              <span>{t.shell.profileHint}</span>
            </span>
          </div>
          <p className="sidebar-note">
            healthier<span>.</span>
          </p>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-mobile-brand">
            <Wordmark />
          </div>
          <div className="topbar-context">
            <span className="topbar-section">{getNavLabel(t, view)}</span>
            <span className="topbar-divider" aria-hidden="true" />
            <span className="topbar-date">{today}</span>
          </div>
          <div className="topbar-actions">
            <LanguageSwitch compact />
            <span className="avatar avatar--topbar" aria-hidden="true">
              <UserRound size={16} strokeWidth={1.8} />
            </span>
          </div>
        </header>

        <div className="app-content">
          {view === "overview" && (
            <Overview onAskDoctor={askDoctor} onNavigate={navigate} />
          )}
          {view === "doctor" && (
            <DoctorChat
              promptSeed={promptSeed}
              onPromptConsumed={consumePrompt}
              onOpenCalculator={() => navigate("calculator")}
            />
          )}
          {view === "calculator" && <CalculatorView />}
          {view === "nearby" && <NearbyCare />}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ key, icon: Icon }) => (
          <button
            type="button"
            key={key}
            className={view === key ? "is-active" : ""}
            onClick={() => navigate(key)}
            aria-current={view === key ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{getNavLabel(t, key)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
