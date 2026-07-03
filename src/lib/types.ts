export type DietType = "meat-eater" | "semi-vegetarian" | "vegetarian";

export type MeatFrequency =
  | "daily"
  | "few-times-week"
  | "weekly"
  | "rarely"
  | "never";

export type FlareState = "active-flare" | "settling" | "calm" | "not-sure";

export type PrimaryGoal =
  | "calm-symptoms"
  | "gain-weight"
  | "lose-weight"
  | "more-energy"
  | "maintain";

export type Unit = "metric" | "imperial";

/** Common dietary restrictions / avoidances. */
export type Restriction =
  | "dairy-free"
  | "egg-free"
  | "fish-shellfish-free"
  | "pork-free"
  | "nut-free"
  | "nightshade-free"
  | "no-added-sugar"
  | "no-caffeine";

export interface Intake {
  // Basic info
  name: string;
  email: string;
  age?: number;
  sex?: "female" | "male" | "prefer-not-to-say";
  unit: Unit;
  weight?: number; // kg (metric) or lb (imperial)
  height?: number; // cm (metric) or in (imperial)

  // Eating style
  dietType: DietType;
  meatFrequency: MeatFrequency;

  // Preferences & restrictions
  restrictions: Restriction[];
  dislikes: string; // free text — foods to avoid
  loves: string; // free text — foods they enjoy

  // Context
  flareState: FlareState;
  goal: PrimaryGoal;
  cookingConfidence?: "minimal" | "some" | "confident";
  notes?: string; // anything else
}

/**
 * A structured interpretation of the raw form, produced by the AI digest stage
 * (with a heuristic fallback). This is what actually drives personalization —
 * turning free-text answers into clean signals for the generator.
 */
export interface IntakeBrief {
  /** Foods to exclude, normalized from dislikes + free-text notes. */
  avoidFoods: string[];
  /** Foods the person enjoys that fit the green/yellow tiers — lean into these. */
  emphasizeFoods: string[];
  /** Restrictions inferred from free text (e.g. "dairy bloats me" → dairy-free). */
  inferredRestrictions: Restriction[];
  /**
   * Things that warrant a stronger "please talk to Sameer / your doctor" nudge:
   * pregnancy/breastfeeding, medications, other diagnoses, severe symptoms, etc.
   */
  safetyFlags: string[];
  /** One-line, human-readable summary of who this person is and what they need. */
  summary: string;
  /** How the digest was produced. */
  digestedBy: "ai" | "heuristic";
}

export interface Meal {
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  title: string;
  items: string[];
  note?: string;
}

export interface DayPlan {
  day: number;
  label: string; // e.g. "Day 1 · Monday"
  meals: Meal[];
}

export interface MealPlan {
  headline: string;
  intro: string;
  days: DayPlan[];
  greenFoundation: string[];
  testCarefully: string[];
  skipForNow: string[];
  hydrationAndSalt: string;
  personalNotes: string[];
  disclaimer: string;
  generatedBy: "ai" | "rules";
  /** How the form was interpreted before the plan was written. */
  digestedBy?: "ai" | "heuristic";
}

export type OrderStatus = "pending" | "paid" | "delivered" | "failed";

export interface Order {
  id: string;
  createdAt: number;
  status: OrderStatus;
  intake: Intake;
  plan?: MealPlan;
  /** epoch ms when the plan should be emailed (the 8-12h "crafting" window). */
  deliverAt?: number;
  deliveredAt?: number;
  paymentRef?: string;
}
