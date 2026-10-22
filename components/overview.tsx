"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Droplets,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { useHealth, useLocale } from "@/components/providers";
import {
  calculateHealth,
  GOAL_KEYS,
} from "@/lib/health";
import { formatNumber } from "@/lib/i18n";
import type { View } from "@/components/healthier-app";

type OverviewProps = {
  onAskDoctor: (prompt?: string) => void;
  onNavigate: (view: View) => void;
};

export function Overview({ onAskDoctor, onNavigate }: OverviewProps) {
  const { locale, t } = useLocale();
  const { profile, hasProfile } = useHealth();
  const [hour, setHour] = useState(9);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const readout = calculateHealth(profile);
  const greeting =
    hour < 12
      ? t.overview.greetingMorning
      : hour < 18
        ? t.overview.greetingAfternoon
        : t.overview.greetingEvening;
  const goalIndex = GOAL_KEYS.indexOf(profile.goal);
  const goalLabel = t.calculator.goals[goalIndex].label;
  const energyProgress = readout.tdee
    ? readout.targetCalories / readout.tdee
    : 0.82;

  return (
    <div className="page overview-page">
      <div className="overview-kicker-row">
        <p className="eyebrow">
          <span className="eyebrow-dot" />
          {t.overview.eyebrow}
        </p>
        <p className="overview-greeting">
          {greeting}
          <span className="greeting-comma">,</span>{" "}
          <span className="greeting-name">{t.overview.greetingName}.</span>
        </p>
      </div>

      <div className="overview-hero-grid">
        <section className="hero-card">
          <div className="hero-card-content">
            <span className="hero-label">
              <HeartPulse size={15} strokeWidth={1.8} />
              {t.overview.heroLabel}
            </span>
            <h1 className="hero-title">
              {t.overview.headlineTop}
              <br />
              <em>{t.overview.headlineBottom}</em>
            </h1>
            <p className="hero-description">{t.overview.description}</p>
            <div className="hero-actions">
              <button
                type="button"
                className="button button--light"
                onClick={() => onAskDoctor()}
              >
                {t.overview.ctaDoctor}
                <ArrowUpRight size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="button button--outline-light"
                onClick={() => onNavigate("calculator")}
              >
                {t.overview.ctaCalculator}
              </button>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <span className="hero-orbit hero-orbit--one" />
            <span className="hero-orbit hero-orbit--two" />
            <span className="hero-orbit hero-orbit--three" />
            <svg
              className="hero-pulse"
              viewBox="0 0 360 100"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M0 55H73L89 55L98 28L111 77L125 40L140 55H198L210 55L220 36L232 68L243 55H360"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="hero-floating-stat">
              <span className="hero-floating-icon">
                <Droplets size={15} strokeWidth={1.8} />
              </span>
              <span>
                <small>{t.overview.water}</small>
                <strong>
                  {formatNumber(readout.waterLiters, locale, 1)}{" "}
                  {t.overview.liters}
                </strong>
              </span>
            </div>
            <span className="hero-art-note">{t.overview.heroArtNote}</span>
          </div>
        </section>

        <aside className="snapshot-card">
          <div className="snapshot-header">
            <div>
              <p className="card-eyebrow">{t.overview.snapshotEyebrow}</p>
              <h2>{t.overview.snapshot}</h2>
            </div>
            <span className="soft-badge">{goalLabel}</span>
          </div>

          {hasProfile ? (
            <>
              <div className="snapshot-main">
                <ProgressRing value={energyProgress} size={146} stroke={7}>
                  <span className="ring-label">{t.overview.dailyCalories}</span>
                  <strong>{formatNumber(readout.targetCalories, locale)}</strong>
                  <span className="ring-unit">{t.shell.kcal}</span>
                </ProgressRing>
                <div className="snapshot-facts">
                  <div className="snapshot-fact">
                    <span>{t.overview.bmi}</span>
                    <strong>{formatNumber(readout.bmi, locale, 1)}</strong>
                    <small>{t.calculator.bmiCategories[readout.bmiCategory]}</small>
                  </div>
                  <div className="snapshot-fact">
                    <span>{t.overview.protein}</span>
                    <strong>
                      {formatNumber(readout.macros.protein, locale)}
                      <i>g</i>
                    </strong>
                    <small>{t.overview.perDay}</small>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="text-link snapshot-link"
                onClick={() => onNavigate("calculator")}
              >
                {t.calculator.results}
                <ArrowRight size={15} strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <div className="snapshot-empty">
              <span className="snapshot-index">01</span>
              <h3>{t.overview.setupTitle}</h3>
              <p>{t.overview.setupBody}</p>
              <button
                type="button"
                className="button button--dark button--full"
                onClick={() => onNavigate("calculator")}
              >
                {t.overview.setupCta}
                <ArrowUpRight size={16} strokeWidth={2} />
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="overview-secondary-grid">
        <section className="ask-panel">
          <div className="ask-panel-copy">
            <p className="card-eyebrow">
              <Sparkles size={13} strokeWidth={1.8} />
              {t.overview.askKicker}
            </p>
            <h2>{t.overview.quickAsk}</h2>
            <p>{t.overview.quickAskBody}</p>
          </div>
          <div className="question-list">
            {t.overview.questions.map((question, index) => (
              <button
                type="button"
                key={question}
                className="question-item"
                onClick={() => onAskDoctor(question)}
              >
                <span className="question-index">0{index + 1}</span>
                <span className="question-text">{question}</span>
                <span className="question-arrow">
                  <ArrowUpRight size={16} strokeWidth={1.8} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="focus-card">
          <p className="card-eyebrow">{t.overview.planEyebrow}</p>
          <div className="focus-heading">
            <h2>{t.overview.focusTitle}</h2>
            <span className="soft-badge soft-badge--ink">{goalLabel}</span>
          </div>
          <p className="focus-body">{t.overview.focusBody}</p>
          <ul className="focus-list">
            {t.overview.focusItems.map((item) => (
              <li key={item}>
                <span className="focus-check">
                  <Check size={12} strokeWidth={2.4} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="text-link focus-link"
            onClick={() => onAskDoctor(t.overview.questions[2])}
          >
            {t.overview.ctaDoctor}
            <ArrowUpRight size={15} strokeWidth={1.8} />
          </button>
        </aside>
      </div>

      <section className="reads-section">
        <div className="section-heading">
          <div>
            <p className="card-eyebrow">{t.overview.tipsEyebrow}</p>
            <h2>{t.overview.tipsTitle}</h2>
          </div>
          <span className="section-rule" aria-hidden="true" />
        </div>
        <div className="reads-grid">
          {t.overview.tips.map((tip, index) => (
            <article className="read-card" key={tip.title}>
              <div className="read-card-top">
                <span className="read-number">0{index + 1}</span>
                <span className="read-tag">{tip.tag}</span>
              </div>
              <h3>{tip.title}</h3>
              <p>{tip.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="page-disclaimer">
        <span className="disclaimer-mark">
          <HeartPulse size={15} strokeWidth={1.8} />
        </span>
        <p>{t.overview.disclaimer}</p>
      </footer>
    </div>
  );
}
