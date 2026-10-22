"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Droplets,
  RotateCcw,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { useHealth, useLocale } from "@/components/providers";
import {
  ACTIVITY_KEYS,
  DEFAULT_PROFILE,
  GOAL_KEYS,
  calculateHealth,
  clamp,
  cmToFeetInches,
  feetInchesToCm,
  isValidProfile,
  kgToLb,
  lbToKg,
  type ActivityKey,
  type GoalKey,
  type Profile,
  type Sex,
  type Unit,
} from "@/lib/health";
import { formatNumber } from "@/lib/i18n";

function toNumber(value: string): number {
  if (!value.trim()) return Number.NaN;
  return Number(value.replace(",", "."));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function CalculatorView() {
  const { locale, t } = useLocale();
  const { profile, hasProfile, setProfile, resetProfile } = useHealth();

  const initialImperial = cmToFeetInches(profile.heightCm);

  const [unit, setUnit] = useState<Unit>(profile.unit);
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [age, setAge] = useState(String(profile.age));
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [weightKg, setWeightKg] = useState(String(profile.weightKg));
  const [heightFt, setHeightFt] = useState(String(initialImperial.feet));
  const [heightIn, setHeightIn] = useState(String(initialImperial.inches));
  const [weightLb, setWeightLb] = useState(
    String(roundOne(kgToLb(profile.weightKg))),
  );
  const [activity, setActivity] = useState<ActivityKey>(profile.activity);
  const [goal, setGoal] = useState<GoalKey>(profile.goal);
  const [dirty, setDirty] = useState(false);

  const parsedAge = toNumber(age);
  const parsedHeightCm =
    unit === "metric"
      ? toNumber(heightCm)
      : feetInchesToCm(
          toNumber(heightFt),
          heightIn.trim() ? toNumber(heightIn) : 0,
        );
  const parsedWeightKg =
    unit === "metric" ? toNumber(weightKg) : lbToKg(toNumber(weightLb));

  const candidate: Profile = {
    unit,
    sex,
    age: parsedAge,
    heightCm: parsedHeightCm,
    weightKg: parsedWeightKg,
    activity,
    goal,
  };
  const valid = isValidProfile(candidate);
  const readout = calculateHealth(valid ? candidate : profile);

  useEffect(() => {
    if (!dirty) return;

    const nextAge = toNumber(age);
    const nextHeight =
      unit === "metric"
        ? toNumber(heightCm)
        : feetInchesToCm(
            toNumber(heightFt),
            heightIn.trim() ? toNumber(heightIn) : 0,
          );
    const nextWeight =
      unit === "metric" ? toNumber(weightKg) : lbToKg(toNumber(weightLb));

    const nextProfile: Profile = {
      unit,
      sex,
      age: nextAge,
      heightCm: nextHeight,
      weightKg: nextWeight,
      activity,
      goal,
    };

    if (isValidProfile(nextProfile)) {
      setProfile(nextProfile);
    }
  }, [
    activity,
    age,
    dirty,
    goal,
    heightCm,
    heightFt,
    heightIn,
    setProfile,
    sex,
    unit,
    weightKg,
    weightLb,
  ]);

  function markDirty() {
    setDirty(true);
  }

  function currentHeightCm(): number {
    const value =
      unit === "metric"
        ? toNumber(heightCm)
        : feetInchesToCm(
            toNumber(heightFt),
            heightIn.trim() ? toNumber(heightIn) : 0,
          );
    return Number.isFinite(value) && value > 0 ? value : profile.heightCm;
  }

  function currentWeightKg(): number {
    const value =
      unit === "metric" ? toNumber(weightKg) : lbToKg(toNumber(weightLb));
    return Number.isFinite(value) && value > 0 ? value : profile.weightKg;
  }

  function changeUnit(nextUnit: Unit) {
    if (nextUnit === unit) return;

    const height = currentHeightCm();
    const weight = currentWeightKg();

    if (nextUnit === "imperial") {
      const imperial = cmToFeetInches(height);
      setHeightFt(String(imperial.feet));
      setHeightIn(String(imperial.inches));
      setWeightLb(String(roundOne(kgToLb(weight))));
    } else {
      setHeightCm(String(Math.round(height)));
      setWeightKg(String(roundOne(weight)));
    }

    setUnit(nextUnit);
    markDirty();
  }

  function handleReset() {
    setDirty(false);
    setUnit(DEFAULT_PROFILE.unit);
    setSex(DEFAULT_PROFILE.sex);
    setAge(String(DEFAULT_PROFILE.age));
    setHeightCm(String(DEFAULT_PROFILE.heightCm));
    setWeightKg(String(DEFAULT_PROFILE.weightKg));
    const imperial = cmToFeetInches(DEFAULT_PROFILE.heightCm);
    setHeightFt(String(imperial.feet));
    setHeightIn(String(imperial.inches));
    setWeightLb(String(roundOne(kgToLb(DEFAULT_PROFILE.weightKg))));
    setActivity(DEFAULT_PROFILE.activity);
    setGoal(DEFAULT_PROFILE.goal);
    resetProfile();
  }

  const weightUnit =
    unit === "metric" ? t.calculator.weightKg : t.calculator.weightLb;
  const healthyMin =
    unit === "metric"
      ? readout.healthyWeightMin
      : Math.round(kgToLb(readout.healthyWeightMin));
  const healthyMax =
    unit === "metric"
      ? readout.healthyWeightMax
      : Math.round(kgToLb(readout.healthyWeightMax));
  const bmiPosition = clamp(((readout.bmi - 15) / (35 - 15)) * 100, 2, 98);
  const targetRatio = readout.tdee
    ? readout.targetCalories / readout.tdee
    : 0.85;
  const macroCalories =
    readout.macros.protein * 4 +
    readout.macros.carbs * 4 +
    readout.macros.fat * 9;
  const macroShares = {
    protein: macroCalories ? (readout.macros.protein * 4) / macroCalories : 0,
    carbs: macroCalories ? (readout.macros.carbs * 4) / macroCalories : 0,
    fat: macroCalories ? (readout.macros.fat * 9) / macroCalories : 0,
  };

  return (
    <div className="page calculator-page">
      <header className="page-heading calculator-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" />
            {t.calculator.eyebrow}
          </p>
          <h1>{t.calculator.title}</h1>
          <p className="page-subtitle">{t.calculator.subtitle}</p>
        </div>
      </header>

      <div className="calculator-layout">
        <section className="calc-form-card">
          <div className="calc-form-top">
            <div>
              <p className="card-eyebrow">{t.calculator.aboutYou}</p>
              <h2>{t.calculator.measurements}</h2>
            </div>
            <div className="unit-switch" role="group" aria-label={t.calculator.units}>
              <span className="unit-switch-label">{t.calculator.units}</span>
              <div>
                <button
                  type="button"
                  className={unit === "metric" ? "is-active" : ""}
                  onClick={() => changeUnit("metric")}
                  aria-pressed={unit === "metric"}
                >
                  {t.calculator.metric}
                </button>
                <button
                  type="button"
                  className={unit === "imperial" ? "is-active" : ""}
                  onClick={() => changeUnit("imperial")}
                  aria-pressed={unit === "imperial"}
                >
                  {t.calculator.imperial}
                </button>
              </div>
            </div>
          </div>

          <div className="calc-section">
            <div className="calc-section-heading">
              <h3>{t.calculator.aboutYou}</h3>
            </div>
            <div className="calc-field-grid">
              <div className="field">
                <span className="field-label">{t.calculator.sex}</span>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={sex === "female" ? "is-active" : ""}
                    onClick={() => {
                      setSex("female");
                      markDirty();
                    }}
                    aria-pressed={sex === "female"}
                  >
                    {t.calculator.female}
                  </button>
                  <button
                    type="button"
                    className={sex === "male" ? "is-active" : ""}
                    onClick={() => {
                      setSex("male");
                      markDirty();
                    }}
                    aria-pressed={sex === "male"}
                  >
                    {t.calculator.male}
                  </button>
                </div>
              </div>

              <label className={`field${!Number.isFinite(parsedAge) ? " is-invalid" : ""}`}>
                <span className="field-label">{t.calculator.age}</span>
                <span className="input-shell">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={13}
                    max={100}
                    value={age}
                    onChange={(event) => {
                      setAge(event.target.value);
                      markDirty();
                    }}
                  />
                  <span className="input-suffix">{t.calculator.years}</span>
                </span>
              </label>
            </div>
          </div>

          <div className="calc-section">
            <div className="calc-section-heading">
              <h3>{t.calculator.measurements}</h3>
              <span>{unit === "metric" ? "cm / kg" : "ft / lb"}</span>
            </div>

            <div className="calc-field-grid">
              {unit === "metric" ? (
                <>
                  <label className="field">
                    <span className="field-label">{t.calculator.height}</span>
                    <span className="input-shell">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={100}
                        max={250}
                        value={heightCm}
                        onChange={(event) => {
                          setHeightCm(event.target.value);
                          markDirty();
                        }}
                      />
                      <span className="input-suffix">{t.calculator.heightCm}</span>
                    </span>
                  </label>
                  <label className="field">
                    <span className="field-label">{t.calculator.weight}</span>
                    <span className="input-shell">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={30}
                        max={300}
                        value={weightKg}
                        onChange={(event) => {
                          setWeightKg(event.target.value);
                          markDirty();
                        }}
                      />
                      <span className="input-suffix">{t.calculator.weightKg}</span>
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <div className="field field--compound">
                    <span className="field-label">{t.calculator.height}</span>
                    <div className="compound-inputs">
                      <span className="input-shell">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={3}
                          max={8}
                          value={heightFt}
                          onChange={(event) => {
                            setHeightFt(event.target.value);
                            markDirty();
                          }}
                        />
                        <span className="input-suffix">{t.calculator.heightFt}</span>
                      </span>
                      <span className="input-shell">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={11.9}
                          value={heightIn}
                          onChange={(event) => {
                            setHeightIn(event.target.value);
                            markDirty();
                          }}
                        />
                        <span className="input-suffix">{t.calculator.heightIn}</span>
                      </span>
                    </div>
                  </div>
                  <label className="field">
                    <span className="field-label">{t.calculator.weight}</span>
                    <span className="input-shell">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={66}
                        max={660}
                        value={weightLb}
                        onChange={(event) => {
                          setWeightLb(event.target.value);
                          markDirty();
                        }}
                      />
                      <span className="input-suffix">{t.calculator.weightLb}</span>
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="calc-section">
            <div className="calc-section-heading">
              <h3>{t.calculator.activity}</h3>
            </div>
            <div className="activity-list">
              {ACTIVITY_KEYS.map((key, index) => {
                const option = t.calculator.activities[index];
                return (
                  <label
                    key={key}
                    className={`activity-option${activity === key ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="activity"
                      value={key}
                      checked={activity === key}
                      onChange={() => {
                        setActivity(key);
                        markDirty();
                      }}
                    />
                    <span className="activity-radio" aria-hidden="true" />
                    <span className="activity-copy">
                      <strong>{option.label}</strong>
                      <small>{option.help}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="calc-section">
            <div className="calc-section-heading">
              <h3>{t.calculator.goal}</h3>
            </div>
            <div className="goal-grid">
              {GOAL_KEYS.map((key, index) => {
                const option = t.calculator.goals[index];
                return (
                  <label
                    key={key}
                    className={`goal-option${goal === key ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={key}
                      checked={goal === key}
                      onChange={() => {
                        setGoal(key);
                        markDirty();
                      }}
                    />
                    <span>{option.label}</span>
                    <small>{option.help}</small>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="calc-form-footer">
            <span className="saved-state">
              {hasProfile ? (
                <>
                  <Check size={14} strokeWidth={2.2} />
                  {t.calculator.saved}
                </>
              ) : null}
              {dirty && !valid ? (
                <span className="invalid-hint">{t.calculator.invalidInput}</span>
              ) : null}
            </span>
            <button
              type="button"
              className="reset-button"
              onClick={handleReset}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
              {t.calculator.reset}
            </button>
          </div>
        </section>

        <aside className="calc-results" aria-live="polite">
          <div className="results-card">
            <div className="results-heading">
              <div>
                <p className="card-eyebrow">{t.calculator.results}</p>
                <span>{t.calculator.resultsHint}</span>
              </div>
            </div>

            <div className="energy-hero">
              <ProgressRing
                value={targetRatio}
                size={154}
                stroke={8}
                className="progress-ring--dark"
              >
                <span className="ring-label">{t.calculator.target}</span>
                <strong>{formatNumber(readout.targetCalories, locale)}</strong>
                <span className="ring-unit">{t.calculator.kcal}</span>
              </ProgressRing>

              <div className="energy-copy">
                <span className="energy-eyebrow">{t.calculator.energy}</span>
                <h2>{t.calculator.target}</h2>
                <p>{t.calculator.targetHelp}</p>
                <div className="energy-stats">
                  <div>
                    <span>{t.calculator.bmr}</span>
                    <strong>{formatNumber(readout.bmr, locale)}</strong>
                    <small>{t.calculator.kcal}</small>
                  </div>
                  <div>
                    <span>{t.calculator.tdee}</span>
                    <strong>{formatNumber(readout.tdee, locale)}</strong>
                    <small>{t.calculator.kcal}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="results-divider" />

            <div className="readout-grid">
              <div className="readout-block readout-block--bmi">
                <div className="readout-label">
                  <span>{t.calculator.bmi}</span>
                  <span
                    className={`category-pill category-pill--${readout.bmiCategory}`}
                  >
                    {t.calculator.bmiCategories[readout.bmiCategory]}
                  </span>
                </div>
                <strong>{formatNumber(readout.bmi, locale, 1)}</strong>
                <span className="readout-caption">
                  {t.calculator.healthyRange}: 18.5–24.9
                </span>
                <div className="bmi-scale">
                  <span className="bmi-scale-track" />
                  <i style={{ left: `${bmiPosition}%` }} />
                </div>
                <div className="bmi-scale-labels">
                  {t.calculator.bmiScale.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>

              <div className="readout-block readout-block--water">
                <span className="water-icon">
                  <Droplets size={19} strokeWidth={1.7} />
                </span>
                <span className="readout-label">
                  <span>{t.calculator.water}</span>
                </span>
                <strong>
                  {formatNumber(readout.waterLiters, locale, 1)}
                  <i>L</i>
                </strong>
                <span className="readout-caption">{t.calculator.waterHelp}</span>
              </div>
            </div>

            <div className="macro-panel">
              <div className="macro-heading">
                <div>
                  <h3>{t.calculator.macros}</h3>
                  <span>{t.calculator.macrosHelp}</span>
                </div>
              </div>
              <div className="macro-list">
                <div className="macro-row">
                  <span className="macro-name">
                    <i className="macro-dot macro-dot--protein" />
                    {t.calculator.protein}
                  </span>
                  <span className="macro-bar">
                    <i
                      className="macro-bar-fill macro-bar-fill--protein"
                      style={{ width: `${macroShares.protein * 100}%` }}
                    />
                  </span>
                  <strong>
                    {formatNumber(readout.macros.protein, locale)}
                    <small>g</small>
                  </strong>
                </div>
                <div className="macro-row">
                  <span className="macro-name">
                    <i className="macro-dot macro-dot--carbs" />
                    {t.calculator.carbs}
                  </span>
                  <span className="macro-bar">
                    <i
                      className="macro-bar-fill macro-bar-fill--carbs"
                      style={{ width: `${macroShares.carbs * 100}%` }}
                    />
                  </span>
                  <strong>
                    {formatNumber(readout.macros.carbs, locale)}
                    <small>g</small>
                  </strong>
                </div>
                <div className="macro-row">
                  <span className="macro-name">
                    <i className="macro-dot macro-dot--fat" />
                    {t.calculator.fat}
                  </span>
                  <span className="macro-bar">
                    <i
                      className="macro-bar-fill macro-bar-fill--fat"
                      style={{ width: `${macroShares.fat * 100}%` }}
                    />
                  </span>
                  <strong>
                    {formatNumber(readout.macros.fat, locale)}
                    <small>g</small>
                  </strong>
                </div>
              </div>
            </div>

            <div className="healthy-weight-row">
              <span>{t.calculator.healthyWeight}</span>
              <strong>
                {formatNumber(healthyMin, locale)}–{formatNumber(healthyMax, locale)}{" "}
                {weightUnit}
              </strong>
            </div>

            <p className="results-note">{t.calculator.notMedical}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
