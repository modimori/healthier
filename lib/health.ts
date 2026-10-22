export type Unit = "metric" | "imperial";
export type Sex = "female" | "male";
export type ActivityKey = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type GoalKey = "lose" | "maintain" | "gain";
export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese";

export type Profile = {
  unit: Unit;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityKey;
  goal: GoalKey;
};

export type HealthReadout = {
  bmi: number;
  bmiCategory: BmiCategory;
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  waterLiters: number;
  healthyWeightMin: number;
  healthyWeightMax: number;
};

export const ACTIVITY_KEYS: ActivityKey[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "athlete",
];

export const ACTIVITY_FACTORS: Record<ActivityKey, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const GOAL_KEYS: GoalKey[] = ["lose", "maintain", "gain"];

export const GOAL_CALORIE_ADJUSTMENT: Record<GoalKey, number> = {
  lose: -400,
  maintain: 0,
  gain: 300,
};

export const DEFAULT_PROFILE: Profile = {
  unit: "metric",
  sex: "female",
  age: 28,
  heightCm: 168,
  weightKg: 70,
  activity: "moderate",
  goal: "maintain",
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function calculateHealth(profile: Profile): HealthReadout {
  const heightM = clamp(profile.heightCm, 80, 260) / 100;
  const weight = clamp(profile.weightKg, 25, 350);
  const age = clamp(profile.age, 13, 100);
  const bmi = weight / (heightM * heightM);

  const sexOffset = profile.sex === "male" ? 5 : -161;
  const bmr =
    10 * weight + 6.25 * (heightM * 100) - 5 * age + sexOffset;
  const tdee = bmr * ACTIVITY_FACTORS[profile.activity];
  const targetCalories =
    Math.round((tdee + GOAL_CALORIE_ADJUSTMENT[profile.goal]) / 10) * 10;

  const proteinPerKg = profile.goal === "maintain" ? 1.6 : 1.8;
  const fatShare = profile.goal === "lose" ? 0.28 : profile.goal === "gain" ? 0.25 : 0.3;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((targetCalories * fatShare) / 9);
  const carbs = Math.max(
    0,
    Math.round((targetCalories - protein * 4 - fat * 9) / 4),
  );

  const activityWaterBonus =
    profile.activity === "active" || profile.activity === "athlete" ? 0.4 : 0;

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: getBmiCategory(bmi),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    macros: { protein, carbs, fat },
    waterLiters: Math.round((weight * 0.033 + activityWaterBonus) * 10) / 10,
    healthyWeightMin: Math.round(18.5 * heightM * heightM),
    healthyWeightMax: Math.round(24.9 * heightM * heightM),
  };
}

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  return {
    feet,
    inches: Math.round((totalInches - feet * 12) * 10) / 10,
  };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function isValidProfile(profile: Profile): boolean {
  return (
    Number.isFinite(profile.age) &&
    profile.age >= 13 &&
    profile.age <= 100 &&
    Number.isFinite(profile.heightCm) &&
    profile.heightCm >= 100 &&
    profile.heightCm <= 250 &&
    Number.isFinite(profile.weightKg) &&
    profile.weightKg >= 30 &&
    profile.weightKg <= 300 &&
    ACTIVITY_KEYS.includes(profile.activity) &&
    GOAL_KEYS.includes(profile.goal) &&
    (profile.sex === "female" || profile.sex === "male") &&
    (profile.unit === "metric" || profile.unit === "imperial")
  );
}
