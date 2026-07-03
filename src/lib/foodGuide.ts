/**
 * The IBD Traffic-Light Food Guide, encoded from Sameer Dossani's guide.
 * This is the single source of truth for both the offline meal-plan generator
 * and the AI prompt, so every plan stays true to his ancestral,
 * evidence-informed approach.
 */

export type Tier = "green" | "yellow" | "red";

export type FoodTag =
  | "ruminant"
  | "poultry"
  | "fish"
  | "eggs"
  | "animal-fat"
  | "organ"
  | "broth"
  | "dairy"
  | "plant-cooked"
  | "fruit"
  | "nuts"
  | "nightshade"
  | "starch"
  | "beverage"
  | "seasoning";

export interface Food {
  name: string;
  tier: Tier;
  tags: FoodTag[];
  note?: string;
}

export const TIER_META: Record<
  Tier,
  { label: string; tagline: string; color: string; dot: string }
> = {
  green: {
    label: "GREEN",
    tagline: "Nourish and calm — your foundation",
    color: "var(--green)",
    dot: "🟢",
  },
  yellow: {
    label: "YELLOW",
    tagline: "It depends — test it back in and watch how you respond",
    color: "var(--amber)",
    dot: "🟡",
  },
  red: {
    label: "RED",
    tagline: "Most people do better without, at least for now",
    color: "var(--rust)",
    dot: "🔴",
  },
};

export const FOODS: Food[] = [
  // GREEN — the foundation
  { name: "Beef (fatty cuts)", tier: "green", tags: ["ruminant", "animal-fat"] },
  { name: "Lamb", tier: "green", tags: ["ruminant", "animal-fat"] },
  { name: "Ground beef", tier: "green", tags: ["ruminant", "animal-fat"] },
  { name: "Ribeye steak", tier: "green", tags: ["ruminant", "animal-fat"] },
  { name: "Salmon", tier: "green", tags: ["fish", "animal-fat"] },
  { name: "Sardines", tier: "green", tags: ["fish", "animal-fat"] },
  { name: "Mackerel", tier: "green", tags: ["fish", "animal-fat"] },
  { name: "Chicken thighs", tier: "green", tags: ["poultry"] },
  { name: "Roast chicken", tier: "green", tags: ["poultry"] },
  { name: "Eggs", tier: "green", tags: ["eggs"] },
  { name: "Egg yolks", tier: "green", tags: ["eggs", "animal-fat"] },
  { name: "Tallow", tier: "green", tags: ["animal-fat"] },
  { name: "Ghee", tier: "green", tags: ["animal-fat", "dairy"] },
  { name: "Butter", tier: "green", tags: ["animal-fat", "dairy"] },
  { name: "Bone broth", tier: "green", tags: ["broth"] },
  { name: "Sea salt", tier: "green", tags: ["seasoning"], note: "More than you think, especially if things are moving fast." },
  {
    name: "White rice",
    tier: "green",
    tags: ["starch"],
    note: "Gentle energy. Mainly for weight: helpful if you're underweight or struggling to keep weight on; skip it if fat loss is the goal.",
  },
  { name: "Liver (organ meat)", tier: "green", tags: ["organ"], note: "Optional — worth adding for specific nutrient needs, not required to heal." },

  // YELLOW — test it
  { name: "Aged / hard cheese", tier: "yellow", tags: ["dairy"], note: "Fermentation and low lactose make these easier to tolerate." },
  { name: "Fermented dairy (kefir, yoghurt)", tier: "yellow", tags: ["dairy"] },
  { name: "Cooked & peeled squash", tier: "yellow", tags: ["plant-cooked"] },
  { name: "Ripe banana", tier: "yellow", tags: ["fruit", "plant-cooked"] },
  { name: "Peeled, well-cooked vegetables", tier: "yellow", tags: ["plant-cooked"] },
  { name: "Cooked carrots", tier: "yellow", tags: ["plant-cooked"] },
  { name: "Coffee", tier: "yellow", tags: ["beverage"] },
  { name: "Nuts (small amounts)", tier: "yellow", tags: ["nuts"], note: "They carry antinutrients — keep portions small." },
  { name: "Tomatoes", tier: "yellow", tags: ["nightshade", "plant-cooked"] },
  { name: "Peppers", tier: "yellow", tags: ["nightshade", "plant-cooked"] },
  { name: "Potatoes", tier: "yellow", tags: ["nightshade", "starch"] },
  { name: "Fruit & honey", tier: "yellow", tags: ["fruit"], note: "Keep occasional, not central, while you're actively healing." },

  // RED — most people do better without, for now
  { name: "Industrial seed & vegetable oils", tier: "red", tags: ["animal-fat"], note: "Canola, sunflower, soybean, generic 'vegetable oil' — inflammatory and oxidized." },
  { name: "Refined sugar & processed food", tier: "red", tags: ["fruit"] },
  { name: "Wheat & gluten grains", tier: "red", tags: ["starch"] },
  { name: "Legumes & beans", tier: "red", tags: ["plant-cooked"], note: "Lectins and antinutrients." },
  { name: "Raw & high-fiber vegetables", tier: "red", tags: ["plant-cooked"], note: "Raw veg, skins, cruciferous (broccoli, cauliflower, kale), salads — bulk and fermentation an inflamed gut can't handle right now." },
  { name: "Alcohol", tier: "red", tags: ["beverage"] },
  { name: "Sugar alcohols & artificial sweeteners", tier: "red", tags: ["seasoning"], note: "Erythritol, xylitol, sorbitol, maltitol, aspartame, sucralose — notorious for gastric distress." },
];

/** Sweeteners Sameer actually uses with clients, if something sweet is wanted. */
export const PREFERRED_SWEETENERS = ["glycine powder", "allulose"];

export const SURPRISES = {
  worse: [
    "Seed oils",
    "Whole-grain bread",
    "Raw-kale salads",
    "Beans",
    'The "healthy" green smoothie',
  ],
  thrive: ["Red meat", "Saturated animal fat", "Salt", "Egg yolks"],
};

export const GREEN_FOODS = FOODS.filter((f) => f.tier === "green");
export const YELLOW_FOODS = FOODS.filter((f) => f.tier === "yellow");
export const RED_FOODS = FOODS.filter((f) => f.tier === "red");

export function foodsByTag(tag: FoodTag, tier?: Tier) {
  return FOODS.filter(
    (f) => f.tags.includes(tag) && (tier ? f.tier === tier : true)
  );
}
