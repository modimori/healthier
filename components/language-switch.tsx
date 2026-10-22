"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/components/providers";

type LanguageSwitchProps = {
  compact?: boolean;
  inverted?: boolean;
};

export function LanguageSwitch({
  compact = false,
  inverted = false,
}: LanguageSwitchProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`language-switch${compact ? " language-switch--compact" : ""}${
        inverted ? " language-switch--inverted" : ""
      }`}
    >
      {!compact && (
        <span className="language-switch-label">
          <Languages size={14} strokeWidth={1.8} />
          {t.shell.language}
        </span>
      )}
      <div className="language-switch-options" role="group" aria-label={t.shell.language}>
        <button
          type="button"
          className={locale === "en" ? "is-active" : ""}
          onClick={() => setLocale("en")}
          aria-pressed={locale === "en"}
        >
          <span className="lang-code">EN</span>
          {!compact && <span>{t.common.english}</span>}
        </button>
        <button
          type="button"
          className={locale === "ar" ? "is-active" : ""}
          onClick={() => setLocale("ar")}
          aria-pressed={locale === "ar"}
        >
          <span className="lang-code">AR</span>
          {!compact && <span>{t.common.arabic}</span>}
        </button>
      </div>
    </div>
  );
}
