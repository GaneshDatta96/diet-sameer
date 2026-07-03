import {
  DietType,
  Intake,
  MeatFrequency,
  Restriction,
} from "./types";

const DIET_TYPES: DietType[] = [
  "meat-eater",
  "semi-vegetarian",
  "vegetarian",
];
const MEAT_FREQ: MeatFrequency[] = [
  "daily",
  "few-times-week",
  "weekly",
  "rarely",
  "never",
];
const RESTRICTIONS: Restriction[] = [
  "dairy-free",
  "egg-free",
  "fish-shellfish-free",
  "pork-free",
  "nut-free",
  "nightshade-free",
  "no-added-sugar",
  "no-caffeine",
];

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseIntake(body: unknown): { intake?: Intake; error?: string } {
  if (!body || typeof body !== "object") return { error: "Missing body" };
  const b = body as Record<string, unknown>;

  const email = str(b.email, 200).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "A valid email is required" };

  const dietType = DIET_TYPES.includes(b.dietType as DietType)
    ? (b.dietType as DietType)
    : undefined;
  if (!dietType) return { error: "Please choose an eating style" };

  const meatFrequency = MEAT_FREQ.includes(b.meatFrequency as MeatFrequency)
    ? (b.meatFrequency as MeatFrequency)
    : dietType === "vegetarian"
      ? "never"
      : undefined;
  if (!meatFrequency) return { error: "Please choose how often you eat meat" };

  const restrictions = Array.isArray(b.restrictions)
    ? (b.restrictions.filter((r) =>
        RESTRICTIONS.includes(r as Restriction)
      ) as Restriction[])
    : [];

  const intake: Intake = {
    name: str(b.name, 120).trim(),
    email,
    age: num(b.age),
    sex:
      b.sex === "female" || b.sex === "male" || b.sex === "prefer-not-to-say"
        ? b.sex
        : undefined,
    unit: b.unit === "imperial" ? "imperial" : "metric",
    weight: num(b.weight),
    height: num(b.height),
    dietType,
    meatFrequency,
    restrictions,
    dislikes: str(b.dislikes, 500),
    loves: str(b.loves, 500),
    flareState:
      b.flareState === "active-flare" ||
      b.flareState === "settling" ||
      b.flareState === "calm" ||
      b.flareState === "not-sure"
        ? b.flareState
        : "not-sure",
    goal:
      b.goal === "calm-symptoms" ||
      b.goal === "gain-weight" ||
      b.goal === "lose-weight" ||
      b.goal === "more-energy" ||
      b.goal === "maintain"
        ? b.goal
        : "calm-symptoms",
    cookingConfidence:
      b.cookingConfidence === "minimal" ||
      b.cookingConfidence === "some" ||
      b.cookingConfidence === "confident"
        ? b.cookingConfidence
        : undefined,
    notes: str(b.notes, 1000),
  };

  return { intake };
}
