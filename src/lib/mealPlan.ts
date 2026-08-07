import {
  DayPlan,
  DietType,
  Intake,
  IntakeBrief,
  Meal,
  MealPlan,
  Restriction,
} from "./types";
import { filterFoodList, parseFoodList } from "./formIntelligence";

/**
 * Deterministic, rules-based 7-day plan generator grounded in the IBD
 * Traffic-Light Food Guide. Runs with zero external dependencies so every
 * order can always be fulfilled even if the AI provider is unavailable.
 */

type Req =
  | "dairy"
  | "eggs"
  | "fish"
  | "poultry"
  | "ruminant"
  | "organ"
  | "nightshade"
  | "nuts"
  | "caffeine"
  | "starch"
  | "pork"
  | "carb"; // banana, honey, rice-style energy — blocked on weight loss

interface Template {
  slot: Meal["slot"];
  title: string;
  items: string[];
  requires: Req[];
  tier: "green" | "yellow";
  diet: DietType[];
  flesh?: boolean;
  goalOnly?: "gain-weight" | "lose-weight";
  note?: string;
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const ALL: DietType[] = ["meat-eater", "semi-vegetarian", "vegetarian"];
const OMNI: DietType[] = ["meat-eater", "semi-vegetarian"];
const VEG: DietType[] = ["vegetarian"];

/** Gentle fermented sides suitable for IBD traffic-light yellow (not achar). */
const FERMENTED_SIDES = [
  "Small spoon of sauerkraut on the side",
  "A few cucumber pickles (brine-fermented, not achar)",
  "Small serving of mild kimchi on the side",
];

const TEMPLATES: Template[] = [
  // ---------------- Breakfast ----------------
  {
    slot: "Breakfast",
    title: "Eggs & butter",
    items: ["3 eggs cooked soft in butter or ghee", "Pinch of sea salt"],
    requires: ["eggs", "dairy"],
    tier: "green",
    diet: ALL,
  },
  {
    slot: "Breakfast",
    title: "Eggs in tallow",
    items: ["3 eggs fried in tallow", "Sea salt"],
    requires: ["eggs"],
    tier: "green",
    diet: OMNI,
  },
  {
    slot: "Breakfast",
    title: "Steak & eggs",
    items: ["Small ribeye or ground beef patty", "2 eggs", "Sea salt"],
    requires: ["ruminant", "eggs"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Breakfast",
    title: "Salmon & eggs",
    items: ["Pan-seared salmon", "2 eggs", "Butter"],
    requires: ["fish", "eggs", "dairy"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Breakfast",
    title: "Omelette with cooked spinach",
    items: [
      "3-egg omelette in butter",
      "Well-cooked spinach wilted soft in ghee",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: well-cooked leafy greens — soft and low-fiber. Skip if they bother you.",
  },
  {
    slot: "Breakfast",
    title: "Soft eggs with sauerkraut",
    items: [
      "3 soft-scrambled eggs in butter",
      "Small spoon of sauerkraut",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: fermented cabbage — start tiny and watch how you respond.",
  },
  {
    slot: "Breakfast",
    title: "Yoghurt bowl with pickles",
    items: [
      "Full-fat plain fermented yoghurt",
      "A few brine pickles on the side",
      "Sea salt",
    ],
    requires: ["dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: fermented dairy + pickles (not achar). Skip fruit for this week if fat loss is the goal.",
  },
  {
    slot: "Breakfast",
    title: "Yoghurt & honey bowl",
    items: [
      "Full-fat plain or fermented yoghurt",
      "Drizzle of raw honey",
      "Ripe banana slices",
    ],
    requires: ["dairy", "carb"],
    tier: "yellow",
    diet: ALL,
    goalOnly: "gain-weight",
    note: "Yellow: honey and banana are energy foods — useful for weight gain, not fat loss.",
  },
  {
    slot: "Breakfast",
    title: "Rice porridge with butter",
    items: ["White rice cooked soft in bone broth", "Butter", "Sea salt"],
    requires: ["starch", "dairy", "carb"],
    tier: "green",
    diet: ALL,
    goalOnly: "gain-weight",
  },
  {
    slot: "Breakfast",
    title: "Zucchini scramble",
    items: [
      "3 eggs scrambled in ghee",
      "Soft, well-cooked zucchini rounds",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: above-ground zucchini, cooked until soft.",
  },
  {
    slot: "Breakfast",
    title: "Cheese omelette",
    items: ["3-egg omelette in butter", "Melted aged cheese", "Sea salt"],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
  },

  // ---------------- Lunch (green foundation — no ferments; use in flares too) ----------------
  {
    slot: "Lunch",
    title: "Roast chicken & broth",
    items: ["Roast chicken thighs (skin on)", "Warm bone broth", "Sea salt"],
    requires: ["poultry"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Beef patty plate",
    items: ["Fatty ground beef cooked in tallow", "Sea salt"],
    requires: ["ruminant"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Lamb & salt",
    items: ["Slow-cooked lamb", "Sea salt"],
    requires: ["ruminant"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Sardines plain",
    items: ["Tinned sardines in olive oil", "Sea salt"],
    requires: ["fish"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Salmon lunch",
    items: ["Pan-seared salmon in butter", "Sea salt"],
    requires: ["fish", "dairy"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Three-egg scramble in ghee",
    items: ["3 eggs soft-scrambled in ghee", "Sea salt"],
    requires: ["eggs", "dairy"],
    tier: "green",
    diet: ALL,
  },
  {
    slot: "Lunch",
    title: "Boiled eggs & butter",
    items: ["3 soft-boiled eggs", "Butter", "Sea salt"],
    requires: ["eggs", "dairy"],
    tier: "green",
    diet: ALL,
  },

  // ---------------- Lunch (yellow — ferments / cooked veg to test when calm) ----------------
  {
    slot: "Lunch",
    title: "Roast chicken with sauerkraut",
    items: [
      "Roast chicken thighs (skin on)",
      "Warm bone broth",
      "Small spoon of sauerkraut",
      "Sea salt",
    ],
    requires: ["poultry"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
    note: "Yellow side: sauerkraut — omit if you're in an active flare.",
  },
  {
    slot: "Lunch",
    title: "Beef & rice bowl",
    items: ["Ground beef in tallow", "White rice", "Sea salt"],
    requires: ["ruminant", "starch", "carb"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
    goalOnly: "gain-weight",
  },
  {
    slot: "Lunch",
    title: "Beef bowl with kimchi",
    items: [
      "Ground beef cooked in tallow",
      "Small serving of mild kimchi",
      "Sea salt",
    ],
    requires: ["ruminant"],
    tier: "yellow",
    diet: ["meat-eater"],
    flesh: true,
    note: "Yellow: mild kimchi on the side — start with a teaspoon.",
  },
  {
    slot: "Lunch",
    title: "Lamb with cooked carrots",
    items: [
      "Slow-cooked lamb",
      "Well-cooked peeled carrots in butter",
      "A few cucumber pickles",
    ],
    requires: ["ruminant", "dairy"],
    tier: "yellow",
    diet: ["meat-eater"],
    flesh: true,
    note: "Yellow: cooked peeled carrots + brine pickles (not achar).",
  },
  {
    slot: "Lunch",
    title: "Sardines with pickles",
    items: [
      "Tinned sardines in olive oil",
      "Brine-fermented cucumber pickles",
      "Sea salt",
    ],
    requires: ["fish"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Sardines on rice",
    items: ["Tinned sardines in olive oil", "White rice", "Sea salt"],
    requires: ["fish", "starch", "carb"],
    tier: "green",
    diet: OMNI,
    flesh: true,
    goalOnly: "gain-weight",
  },
  {
    slot: "Lunch",
    title: "Salmon with cooked green beans",
    items: [
      "Pan-seared salmon in butter",
      "Well-cooked green beans (soft, not crunchy)",
      "Sea salt",
    ],
    requires: ["fish", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
    note: "Yellow: above-ground green beans, cooked until tender.",
  },
  {
    slot: "Lunch",
    title: "Eggs with sauerkraut",
    items: [
      "3 eggs soft-scrambled in ghee",
      "Small spoon of sauerkraut",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
  },
  {
    slot: "Lunch",
    title: "Egg & rice bowl",
    items: ["Soft-cooked eggs over white rice", "Ghee", "Sea salt"],
    requires: ["eggs", "starch", "dairy", "carb"],
    tier: "green",
    diet: ALL,
    goalOnly: "gain-weight",
  },
  {
    slot: "Lunch",
    title: "Cheese & egg plate",
    items: [
      "Aged hard cheese",
      "2 boiled eggs",
      "Butter",
      "A few cucumber pickles",
    ],
    requires: ["dairy", "eggs"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: aged cheese + brine pickles — fermented foods, not achar.",
  },
  {
    slot: "Lunch",
    title: "Egg & squash bowl",
    items: [
      "3 eggs scrambled in ghee",
      "Cooked, peeled squash",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: cooked & peeled squash — a gentle plant to test.",
  },
  {
    slot: "Lunch",
    title: "Zucchini eggs plate",
    items: [
      "2 soft-boiled eggs",
      "Zucchini cooked soft in butter until melting",
      "Small spoon of sauerkraut",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: above-ground veg, well-cooked. Great vegetarian fat-loss style plate.",
  },
  {
    slot: "Lunch",
    title: "Ghee-cooked greens & eggs",
    items: [
      "Well-cooked spinach or courgette in ghee",
      "2 fried eggs",
      "Aged cheese (optional)",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: VEG,
    note: "Vegetarian weight-friendly: above-ground veg cooked soft with butter/ghee.",
  },
  {
    slot: "Lunch",
    title: "Asparagus egg plate",
    items: [
      "Asparagus tips steamed or sautéed soft in butter",
      "3-egg omelette",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: VEG,
    note: "Yellow: tender asparagus tips only — stop if fibrous ends bother you.",
  },
  {
    slot: "Lunch",
    title: "Vegetarian egg plate",
    items: ["3 fried eggs in ghee", "Sea salt"],
    requires: ["eggs", "dairy"],
    tier: "green",
    diet: VEG,
  },

  // ---------------- Dinner (green foundation) ----------------
  {
    slot: "Dinner",
    title: "Ribeye & butter",
    items: ["Fatty ribeye steak", "Butter", "Sea salt"],
    requires: ["ruminant", "dairy"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Beef patties in tallow",
    items: ["Fatty ground beef patties", "Cooked in tallow", "Sea salt"],
    requires: ["ruminant"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Lamb chops",
    items: ["Lamb chops cooked in ghee", "Sea salt"],
    requires: ["ruminant", "dairy"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Baked salmon",
    items: ["Baked salmon with butter", "Warm bone broth on the side"],
    requires: ["fish", "dairy"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Chicken thighs plain",
    items: ["Roasted chicken thighs with skin", "Sea salt"],
    requires: ["poultry"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Omelette supper",
    items: ["Large 3-egg omelette in butter", "Sea salt"],
    requires: ["eggs", "dairy"],
    tier: "green",
    diet: ALL,
  },
  {
    slot: "Dinner",
    title: "Soft eggs & cheese",
    items: ["Soft-scrambled eggs in ghee", "Aged cheese", "Sea salt"],
    requires: ["eggs", "dairy"],
    tier: "green",
    diet: ALL,
  },

  // ---------------- Dinner (yellow — veg / ferments when calm) ----------------
  {
    slot: "Dinner",
    title: "Ribeye with sauerkraut",
    items: [
      "Fatty ribeye steak",
      "Butter",
      "Small spoon of sauerkraut",
      "Sea salt",
    ],
    requires: ["ruminant", "dairy"],
    tier: "yellow",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Beef patties with kimchi",
    items: [
      "Fatty ground beef patties",
      "Cooked in tallow",
      "Mild kimchi on the side",
      "Sea salt",
    ],
    requires: ["ruminant"],
    tier: "yellow",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Lamb chops with pickles",
    items: [
      "Lamb chops cooked in ghee",
      "Brine cucumber pickles",
      "Sea salt",
    ],
    requires: ["ruminant", "dairy"],
    tier: "yellow",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Salmon with sauerkraut",
    items: [
      "Baked salmon with butter",
      "Warm bone broth on the side",
      "Small spoon of sauerkraut",
    ],
    requires: ["fish", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Mackerel & rice",
    items: ["Grilled mackerel", "White rice", "Sea salt"],
    requires: ["fish", "starch", "carb"],
    tier: "green",
    diet: OMNI,
    flesh: true,
    goalOnly: "gain-weight",
  },
  {
    slot: "Dinner",
    title: "Mackerel with green beans",
    items: [
      "Grilled mackerel",
      "Green beans cooked soft in butter",
      "Sea salt",
    ],
    requires: ["fish", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Chicken thighs & squash",
    items: [
      "Roasted chicken thighs",
      "Cooked, peeled squash in ghee",
      "A few cucumber pickles",
    ],
    requires: ["poultry", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Chicken with cooked zucchini",
    items: [
      "Chicken thighs roasted with skin",
      "Zucchini cooked soft in butter",
      "Sea salt",
    ],
    requires: ["poultry", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Omelette & cheese with kimchi",
    items: [
      "Large 3-egg omelette in butter",
      "Melted aged cheese",
      "Small serving of mild kimchi",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Vegetarian-friendly protein on eggs and fermented dairy, with a fermented side.",
  },
  {
    slot: "Dinner",
    title: "Egg & rice comfort bowl",
    items: ["Soft-cooked eggs over white rice", "Ghee and sea salt"],
    requires: ["eggs", "starch", "dairy", "carb"],
    tier: "green",
    diet: ALL,
    goalOnly: "gain-weight",
  },
  {
    slot: "Dinner",
    title: "Butter-cooked vegetable plate",
    items: [
      "Zucchini and green beans cooked until soft in butter/ghee",
      "2 soft-boiled eggs or aged cheese",
      "Small spoon of sauerkraut",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: VEG,
    note: "Vegetarian plate: above-ground veg, well-cooked in butter/ghee — especially good when fat loss is the goal.",
  },
  {
    slot: "Dinner",
    title: "Spinach ghee eggs",
    items: [
      "Spinach wilted soft in plenty of ghee",
      "Fried eggs on top",
      "Brine pickles on the side",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: VEG,
  },
  {
    slot: "Dinner",
    title: "Courgette friendly dinner",
    items: [
      "Thick courgette slices roasted soft in butter",
      "Aged cheese",
      "Soft-scrambled eggs",
      "Sea salt",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: VEG,
  },
  {
    slot: "Dinner",
    title: "Salmon egg supper",
    items: [
      "Baked salmon",
      "Side of soft-scrambled eggs in butter",
      "Small spoon of sauerkraut",
    ],
    requires: ["fish", "eggs", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Olive-oil zucchini eggs",
    items: [
      "Zucchini cooked soft in olive oil",
      "2 fried eggs",
      "Sea salt",
    ],
    requires: ["eggs"],
    tier: "yellow",
    diet: VEG,
    note: "Dairy-free vegetarian: above-ground veg cooked soft in olive oil.",
  },
  {
    slot: "Dinner",
    title: "Green beans & eggs (no dairy)",
    items: [
      "Green beans cooked soft in olive oil",
      "Soft-boiled eggs",
      "Sea salt",
    ],
    requires: ["eggs"],
    tier: "yellow",
    diet: VEG,
  },
  {
    slot: "Lunch",
    title: "Aged cheese & zucchini",
    items: [
      "Zucchini roasted soft in ghee",
      "Aged hard cheese",
      "Sea salt",
    ],
    requires: ["dairy"],
    tier: "yellow",
    diet: VEG,
    note: "Egg-free vegetarian plate with well-cooked above-ground veg.",
  },
  {
    slot: "Dinner",
    title: "Cheese spinach ghee",
    items: [
      "Spinach wilted soft in ghee",
      "Aged cheese",
      "Sea salt",
    ],
    requires: ["dairy"],
    tier: "yellow",
    diet: VEG,
  },

  // ---------------- Snacks ----------------
  {
    slot: "Breakfast",
    title: "Courgette scramble bowl",
    items: [
      "2 eggs scrambled in olive oil",
      "Courgette cooked soft until melting",
      "Sea salt",
    ],
    requires: ["eggs"],
    tier: "yellow",
    diet: VEG,
    note: "Dairy-free vegetarian breakfast with above-ground veg.",
  },
  {
    slot: "Lunch",
    title: "Spinach egg olive-oil plate",
    items: [
      "Spinach wilted soft in olive oil",
      "2 soft-boiled eggs",
      "Sea salt",
    ],
    requires: ["eggs"],
    tier: "yellow",
    diet: VEG,
  },
  {
    slot: "Dinner",
    title: "Green beans cheese plate",
    items: [
      "Green beans cooked soft in ghee",
      "Aged hard cheese",
      "Sea salt",
    ],
    requires: ["dairy"],
    tier: "yellow",
    diet: VEG,
    note: "Egg-free vegetarian dinner — veg is the centre of the plate.",
  },
  {
    slot: "Snack",
    title: "Warm bone broth",
    items: ["A mug of salted bone broth"],
    requires: [],
    tier: "green",
    diet: OMNI,
  },
  {
    slot: "Snack",
    title: "Boiled eggs",
    items: ["2 boiled eggs with sea salt"],
    requires: ["eggs"],
    tier: "green",
    diet: ALL,
  },
  {
    slot: "Snack",
    title: "Cheese & butter",
    items: ["A few pieces of aged cheese"],
    requires: ["dairy"],
    tier: "yellow",
    diet: ALL,
  },
  {
    slot: "Snack",
    title: "Sauerkraut spoon",
    items: ["1–2 small spoons of sauerkraut"],
    requires: [],
    tier: "yellow",
    diet: ALL,
    note: "Yellow fermented food — tiny portion to start.",
  },
  {
    slot: "Snack",
    title: "Cucumber pickles",
    items: ["A few brine-fermented cucumber pickles (not achar)"],
    requires: [],
    tier: "yellow",
    diet: ALL,
  },
  {
    slot: "Snack",
    title: "Mild kimchi bite",
    items: ["A teaspoon of mild kimchi"],
    requires: [],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: fermented, start very small.",
  },
  {
    slot: "Snack",
    title: "Ripe banana",
    items: ["1 ripe banana"],
    requires: ["carb"],
    tier: "yellow",
    diet: ALL,
    goalOnly: "gain-weight",
    note: "Yellow: gentle fruit for energy / weight gain — skip when fat loss is the goal.",
  },
  {
    slot: "Snack",
    title: "Small handful of nuts",
    items: ["A small handful of macadamias or almonds"],
    requires: ["nuts"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: small amounts — they carry antinutrients.",
  },
];

const RESTRICTION_TO_REQ: Partial<Record<Restriction, Req>> = {
  "dairy-free": "dairy",
  "egg-free": "eggs",
  "fish-shellfish-free": "fish",
  "pork-free": "pork",
  "nut-free": "nuts",
  "nightshade-free": "nightshade",
  "no-caffeine": "caffeine",
};

function meatBudget(intake: Intake): number {
  if (intake.dietType === "vegetarian") return 0;
  switch (intake.meatFrequency) {
    case "daily":
      return 14;
    case "few-times-week":
      return 8;
    case "weekly":
      return 4;
    case "rarely":
      return 2;
    case "never":
      return 0;
    default:
      return 8;
  }
}

export function generateMealPlan(
  intake: Intake,
  brief?: IntakeBrief
): MealPlan {
  const blockedReqs = new Set<Req>();
  for (const r of intake.restrictions) {
    const req = RESTRICTION_TO_REQ[r];
    if (req) blockedReqs.add(req);
  }
  for (const r of brief?.inferredRestrictions ?? []) {
    const req = RESTRICTION_TO_REQ[r];
    if (req) blockedReqs.add(req);
  }

  const activeFlare = intake.flareState === "active-flare";
  const safetyText = (brief?.safetyFlags ?? []).join(" ").toLowerCase();
  const cautionFromSafety =
    /(bleeding|prednisone|steroid|humira|biologic|surgery|resection)/.test(
      safetyText
    );
  /** Treat medicated / bleeding weeks like a green-only flare for meal picking. */
  const greenOnlyWeek = activeFlare || cautionFromSafety;
  const nightshadeFree =
    intake.restrictions.includes("nightshade-free") ||
    blockedReqs.has("nightshade");
  const wantsGain = intake.goal === "gain-weight";
  const wantsLose = intake.goal === "lose-weight";

  const dislikeWords = [
    ...parseFoodList(intake.dislikes || ""),
    ...filterFoodList(brief?.avoidFoods ?? []),
  ];

  const fermentLadder = nightshadeFree
    ? [
        "½ teaspoon sauerkraut on the side (tiny start)",
        "1 small spoon of sauerkraut",
        "A few brine cucumber pickles (not achar)",
        "Brine cucumber pickles on the side",
      ]
    : [
        "½ teaspoon sauerkraut on the side (tiny start)",
        "1 small spoon of sauerkraut",
        "A few brine cucumber pickles (not achar)",
        "Small serving of mild kimchi (go easy if spicy)",
      ];

  function allowed(t: Template): boolean {
    if (!t.diet.includes(intake.dietType)) return false;
    if (t.requires.some((req) => blockedReqs.has(req))) return false;
    if (greenOnlyWeek && t.tier !== "green") return false;
    if (t.goalOnly === "gain-weight" && !wantsGain) return false;
    if (t.goalOnly === "lose-weight" && !wantsLose) return false;
    if (wantsLose && (t.requires.includes("starch") || t.requires.includes("carb"))) {
      return false;
    }
    const text = (t.title + " " + t.items.join(" ")).toLowerCase();
    if (nightshadeFree && /kimchi/.test(text)) return false;
    if (dislikeWords.some((w) => w.length > 2 && text.includes(w))) return false;
    return true;
  }

  const pool = {
    Breakfast: TEMPLATES.filter((t) => t.slot === "Breakfast" && allowed(t)),
    Lunch: TEMPLATES.filter((t) => t.slot === "Lunch" && allowed(t)),
    Dinner: TEMPLATES.filter((t) => t.slot === "Dinner" && allowed(t)),
    Snack: TEMPLATES.filter((t) => t.slot === "Snack" && allowed(t)),
  };

  const safeFallback: Record<Meal["slot"], Meal> = {
    Breakfast: {
      slot: "Breakfast",
      title: "Gentle start",
      items: ["Warm bone broth or a soft-cooked egg", "Sea salt"],
      note: "Kept minimal to match your restrictions — a consult can widen this safely.",
    },
    Lunch: {
      slot: "Lunch",
      title: "Simple protein plate",
      items: [
        "Your tolerated green-tier protein",
        "Cooked in a natural animal fat",
        "Sea salt",
      ],
    },
    Dinner: {
      slot: "Dinner",
      title: "Foundation dinner",
      items: ["A green-tier protein", "A natural fat", "Sea salt"],
    },
    Snack: {
      slot: "Snack",
      title: "Optional",
      items: ["A mug of warm, salted broth if hungry"],
    },
  };

  let fleshLeft = meatBudget(intake);
  const usedBySlot: Record<Meal["slot"], Set<string>> = {
    Breakfast: new Set(),
    Lunch: new Set(),
    Dinner: new Set(),
    Snack: new Set(),
  };
  const usedTitles = new Set<string>();
  let carbMealsPlaced = 0;
  const carbTarget = wantsGain ? 5 : 0; // ~5 carb-forward meals across the week when gaining
  const emphasize = [
    ...parseFoodList(intake.loves || ""),
    ...filterFoodList(brief?.emphasizeFoods ?? []),
  ];
  const needsCookedVegFocus =
    intake.dietType === "vegetarian" ||
    (wantsLose && intake.dietType === "semi-vegetarian");
  let cookedVegPlaced = 0;
  const cookedVegTarget = needsCookedVegFocus
    ? wantsLose
      ? 6
      : 4
    : wantsLose
      ? 2
      : 0;

  function hay(t: Template) {
    return (t.title + " " + t.items.join(" ")).toLowerCase();
  }
  function isCookedVeg(t: Template) {
    return /(zucchini|green beans|spinach|asparagus|squash|courgette)/.test(hay(t));
  }
  function isCarbMeal(t: Template) {
    return t.requires.includes("starch") || t.requires.includes("carb");
  }
  function loveHits(t: Template) {
    return emphasize.filter((w) => w.length > 2 && hay(t).includes(w)).length;
  }
  function proteinFamily(t: Template): string {
    const h = hay(t);
    if (/(ribeye|beef|steak|lamb|ground beef|patty)/.test(h)) return "ruminant";
    if (/(salmon|sardine|mackerel|fish)/.test(h)) return "fish";
    if (/(chicken|poultry)/.test(h)) return "poultry";
    if (/(egg)/.test(h)) return "egg";
    if (/(cheese|yoghurt|yogurt)/.test(h)) return "dairy";
    return "other";
  }

  let lastFamily: string | null = null;

  function scoreTemplate(
    t: Template,
    day: number,
    slot: Meal["slot"],
    candidates: Template[]
  ): number {
    let score = 0;
    // Prefer unused titles (week + slot)
    if (!usedTitles.has(t.title)) score += 40;
    if (!usedBySlot[slot].has(t.title)) score += 25;
    // Spread across the week
    score += ((day * 3 + slotIndex(slot) + t.title.length) % candidates.length) * 0.01;

    const loves = loveHits(t);
    score += loves * 18;

    if (needsCookedVegFocus && isCookedVeg(t)) {
      score += cookedVegPlaced < cookedVegTarget ? 35 : 12;
    }
    if (wantsLose && isCarbMeal(t)) score -= 100;
    if (wantsLose && !isCarbMeal(t)) score += 8;
    if (wantsLose && /(protein|egg|beef|lamb|salmon|cheese)/.test(hay(t))) score += 6;

    if (wantsGain && isCarbMeal(t)) {
      const needMore = carbMealsPlaced < carbTarget;
      // Schedule carb meals on most days at lunch or dinner
      const carbSlot = slot === "Lunch" || slot === "Dinner";
      score += needMore && carbSlot ? 40 : needMore ? 10 : 5;
    }
    if (intake.goal === "more-energy" && (isCookedVeg(t) || isCarbMeal(t) || t.flesh)) {
      score += 6;
    }
    if (intake.goal === "calm-symptoms" && t.tier === "green") score += 10;
    if (greenOnlyWeek && t.tier === "green") score += 15;

    const fam = proteinFamily(t);
    if (lastFamily && fam === lastFamily) score -= 20;
    if (fam !== "other" && fam !== "egg") score += 2;

    // Vegetarian honesty: prefer veg-centred plates over bare egg fallbacks when available
    if (intake.dietType === "vegetarian" && isCookedVeg(t)) score += 20;
    if (intake.dietType === "vegetarian" && /^three-egg|^boiled eggs|^omelette supper$/i.test(t.title) && cookedVegPlaced < cookedVegTarget) {
      score -= 8;
    }

    return score;
  }

  function choose(
    options: Template[],
    day: number,
    slot: Meal["slot"]
  ): Template | null {
    if (!options.length) return null;

    let candidates = options;
    if (fleshLeft <= 0) {
      const nonFlesh = options.filter((o) => !o.flesh);
      if (nonFlesh.length) candidates = nonFlesh;
    }

    // Never prefer empty — if cooked-veg needed and available, bias hard
    if (needsCookedVegFocus && cookedVegPlaced < cookedVegTarget && (slot === "Lunch" || slot === "Dinner")) {
      const veggy = candidates.filter(isCookedVeg);
      if (veggy.length) candidates = veggy;
    }

    // Gain weight: push carb meals until target hit
    if (wantsGain && carbMealsPlaced < carbTarget && (slot === "Lunch" || slot === "Dinner")) {
      const carbs = candidates.filter(isCarbMeal);
      if (carbs.length) candidates = carbs;
    }

    const ranked = [...candidates].sort(
      (a, b) => scoreTemplate(b, day, slot, candidates) - scoreTemplate(a, day, slot, candidates)
    );
    const chosen = ranked[0];
    usedTitles.add(chosen.title);
    usedBySlot[slot].add(chosen.title);
    if (chosen.flesh) fleshLeft--;
    if (isCarbMeal(chosen)) carbMealsPlaced++;
    if (isCookedVeg(chosen)) cookedVegPlaced++;
    lastFamily = proteinFamily(chosen);
    return chosen;
  }

  function toMeal(t: Template, day: number): Meal {
    let items = [...t.items];
    if (nightshadeFree) {
      items = items.filter((i) => !/kimchi/i.test(i));
    }
    const alreadyFermented = items.some((i) =>
      /sauerkraut|kimchi|pickle/i.test(i)
    );
    if (
      !greenOnlyWeek &&
      t.slot === "Dinner" &&
      !alreadyFermented &&
      day % 2 === 0
    ) {
      items.push(fermentLadder[Math.min(day, fermentLadder.length - 1)]);
    }
    return {
      slot: t.slot,
      title: t.title,
      items,
      note: t.note,
    };
  }

  function dayWhy(dayIndex: number, meals: Meal[]): string {
    const blob = meals
      .map((m) => `${m.title} ${m.items.join(" ")}`)
      .join(" ")
      .toLowerCase();
    const parts: string[] = [];
    if (greenOnlyWeek) {
      parts.push(
        activeFlare
          ? "green-only while you're in a flare"
          : "kept greener because of meds / safety signals you mentioned"
      );
    } else if (/(sauerkraut|kimchi|pickle)/.test(blob)) {
      parts.push("includes a small fermented side to test");
    }
    if (wantsLose) parts.push("protein + fat heavy, no weight-gain carbs");
    if (wantsGain && /\brice\b|banana|honey/.test(blob)) {
      parts.push("soft carbs for weight gain");
    }
    if (/(zucchini|green beans|spinach|asparagus|squash|courgette)/.test(blob)) {
      parts.push("well-cooked above-ground veg");
    }
    if (emphasize.some((w) => w.length > 2 && blob.includes(w))) {
      parts.push("leans into foods you said you enjoy");
    }
    if (!parts.length) parts.push("simple green-foundation plate");
    return `Day ${dayIndex + 1} focus: ${parts.join(" · ")}.`;
  }

  const days: DayPlan[] = [];
  for (let d = 0; d < 7; d++) {
    const meals: Meal[] = [];
    lastFamily = null;
    for (const slot of ["Breakfast", "Lunch", "Dinner"] as const) {
      const chosen = choose(pool[slot], d, slot);
      if (!chosen) {
        const any = pool[slot][0];
        meals.push(any ? toMeal(any, d) : safeFallback[slot]);
        continue;
      }
      meals.push(toMeal(chosen, d));
    }
    if (d % 2 === 0 && pool.Snack.length) {
      const s = choose(pool.Snack, d, "Snack");
      if (s) meals.push(toMeal(s, d));
    }
    days.push({
      day: d + 1,
      label: `Day ${d + 1} · ${DAY_NAMES[d]}`,
      why: dayWhy(d, meals),
      meals,
    });
  }

  const thinPool =
    Math.min(pool.Breakfast.length, pool.Lunch.length, pool.Dinner.length) < 3;
  const notes = buildPersonalNotes(intake, brief, {
    cookedVegPlaced,
    carbMealsPlaced,
    thinPool,
  });

  return {
    headline: `${intake.name ? intake.name.split(" ")[0] + "'s" : "Your"} 7-Day Gut Freedom Starter Plan`,
    intro: buildIntro(intake),
    days,
    greenFoundation: greenFoundationFor(intake),
    testCarefully: [
      "Aged / fermented dairy",
      nightshadeFree
        ? "Small amounts of fermented vegetables — sauerkraut and brine cucumber pickles (not achar); skip kimchi while nightshades are out"
        : "Small amounts of fermented vegetables — sauerkraut, mild kimchi, brine cucumber pickles (not achar)",
      "Cooked, peeled, low-fiber plants (squash, well-cooked zucchini / green beans; ripe banana only if weight gain is a goal)",
      "Coffee, small amounts of nuts, nightshades, occasional fruit & honey",
    ],
    skipForNow: [
      "Industrial seed & vegetable oils (canola, sunflower, soybean)",
      "Refined sugar and processed food",
      "Wheat, gluten and other grains",
      "Legumes & beans",
      "Raw and high-fiber vegetables (salads, cruciferous raw, skins)",
      "Spicy achar / vinegar-heavy commercial pickles if they flare you",
      "Alcohol and artificial sweeteners / sugar alcohols",
    ],
    hydrationAndSalt:
      "Salt more than you think, especially if things are moving fast, and keep water steady through the day. Warm bone broth counts.",
    shoppingList: buildShoppingList(days),
    prepTips: buildPrepTips(intake, days),
    swaps: buildSwaps(intake),
    personalNotes: notes,
    disclaimer:
      "This plan is educational, not medical advice. It's built on population-level patterns from Sameer's traffic-light approach — not on your labs, history or how your body is responding this week. It is not a substitute for care from your doctor, especially during an active flare. Two people with the same diagnosis can have completely different triggers, which is exactly why a plan built around you works better than a generic one.",
    generatedBy: "rules",
    digestedBy: brief?.digestedBy,
  };
}

function slotIndex(slot: Meal["slot"]) {
  return slot === "Breakfast" ? 0 : slot === "Lunch" ? 1 : slot === "Dinner" ? 2 : 3;
}

function buildIntro(intake: Intake): string {
  const first = intake.name ? intake.name.split(" ")[0] : "there";
  const flareLine =
    intake.flareState === "active-flare"
      ? "Because you told us things are flaring right now, this week stays firmly on the green foundation — nutrient-dense, easy to digest, nothing that feeds the bacteria driving your symptoms."
      : intake.flareState === "calm"
        ? "Since things are relatively calm, we've kept a strong green foundation and gently folded in a few yellow foods — including small fermented sides — for you to test and watch."
        : "We've anchored this week on the green foundation and added a small number of yellow foods (including fermented vegetables) to test carefully.";

  let goalLine = "";
  if (intake.goal === "lose-weight") {
    goalLine =
      " Fat-loss mode: no rice, banana or honey this week — protein, natural fats and (where they fit) well-cooked vegetables do the work.";
  } else if (intake.goal === "gain-weight") {
    goalLine =
      " Weight-gain mode: white rice and generous animal fats show up across the week so you have soft calories to build from.";
  } else if (intake.goal === "more-energy") {
    goalLine =
      " Energy focus: steady protein, salted meals, and enough fat so you're not running on fumes.";
  } else if (intake.goal === "calm-symptoms") {
    goalLine =
      " Symptom-calm focus: keep the plate simple, green-first, and notice how each day feels.";
  }

  return `Hi ${first} — think of this as a starting map, not a life sentence. ${flareLine}${goalLine} Eat to appetite, salt your food, and pay attention to how each day feels.`;
}

function greenFoundationFor(intake: Intake): string[] {
  const flare = intake.flareState === "active-flare";
  if (intake.dietType === "vegetarian") {
    const veg: string[] = [];
    if (!intake.restrictions.includes("egg-free")) {
      veg.push("Eggs and egg yolks");
    }
    if (!intake.restrictions.includes("dairy-free")) {
      veg.push(
        "Fermented / aged dairy and natural fats (butter, ghee) if tolerated"
      );
      veg.push(
        "Well-cooked above-ground vegetables in butter or ghee (zucchini, green beans, soft spinach)"
      );
    } else {
      veg.push(
        "Well-cooked above-ground vegetables in olive oil (zucchini, green beans, soft spinach)"
      );
      veg.push("Egg yolks and olive oil for fat (if eggs are allowed)");
    }
    veg.push("Sea salt and plenty of water");
    if (intake.goal === "gain-weight") {
      veg.splice(Math.max(veg.length - 1, 0), 0, "White rice for gentle energy while you build weight");
    }
    return veg;
  }
  const base = [
    "Ruminant meat — beef, lamb (fatty cuts are your friend)",
    "Fatty fish — salmon, sardines, mackerel",
    "Eggs, poultry, and animal fats (tallow, ghee, butter)",
    "Bone broth, sea salt and water",
  ];
  if (!flare) {
    base.push(
      "Small fermented sides when calm — sauerkraut, mild kimchi, brine pickles (not achar)"
    );
  }
  if (intake.goal === "gain-weight") {
    base.push("White rice — a gentle source of energy while you build weight");
  }
  return base;
}

function buildPersonalNotes(
  intake: Intake,
  brief?: IntakeBrief,
  stats?: { cookedVegPlaced: number; carbMealsPlaced: number; thinPool: boolean }
): string[] {
  const notes: string[] = [];
  const first = intake.name ? intake.name.split(" ")[0] : "you";
  const dairyFree = intake.restrictions.includes("dairy-free");
  const eggFree = intake.restrictions.includes("egg-free");

  const inferred = (brief?.inferredRestrictions ?? []).filter(
    (r) => !intake.restrictions.includes(r)
  );
  if (inferred.length) {
    notes.push(
      `From what you wrote, we also worked around ${inferred
        .map((r) => r.replace(/-/g, " "))
        .join(", ")}. If we read that wrong, a quick call sets it straight.`
    );
  }

  if (intake.dietType === "vegetarian") {
    if (eggFree && dairyFree) {
      notes.push(
        "Honest note: vegetarian + egg-free + dairy-free leaves very little in the green foundation for an inflamed gut. This week's plate is intentionally narrow — a call with Sameer is the right next step to fill gaps safely."
      );
    } else if (eggFree) {
      notes.push(
        "You're vegetarian and egg-free, so plates lean on aged cheese, ghee/butter and well-cooked above-ground vegetables where tolerated. The ancestral foundation still runs thin here — a consult helps fill the gaps."
      );
    } else if (dairyFree) {
      notes.push(
        "You're vegetarian and dairy-free, so we lean on eggs plus above-ground vegetables cooked soft in olive oil (not butter/ghee). That combination works for many people, but it's still a thinner foundation than a meat-based week."
      );
    } else if (intake.goal === "lose-weight") {
      notes.push(
        "You're vegetarian and aiming for fat loss, so this week centres on eggs, fermented dairy, and above-ground vegetables cooked soft in butter or ghee — not bananas or rice."
      );
    } else {
      notes.push(
        "You're eating vegetarian, so this plan leans on eggs, fermented dairy, and well-cooked vegetables in butter/ghee. Honest note: the ancestral foundation is animal-based, and a fully plant-based version has real gaps for an inflamed gut. This is where a quick call with Sameer can help you close those gaps safely."
      );
    }
    if (stats && stats.cookedVegPlaced > 0) {
      notes.push(
        `We placed well-cooked above-ground vegetables on ${stats.cookedVegPlaced} meals this week so the plate isn't only eggs and cheese.`
      );
    }
  }
  if (intake.dietType === "semi-vegetarian") {
    notes.push(
      `You eat meat ${labelFrequency(intake.meatFrequency)}, so we've spaced animal-flesh meals across the week and filled the rest with eggs, fish, fermented dairy and fermented vegetable sides where they fit.`
    );
  }
  if (intake.goal === "gain-weight") {
    notes.push(
      stats && stats.carbMealsPlaced > 0
        ? `Because you want to gain weight, we scheduled about ${stats.carbMealsPlaced} soft-carb meals (white rice / gentle energy foods) across the week, plus generous fats. Eat to a comfortable fullness.`
        : "Because you want to gain weight, lean into white rice and generous fats wherever they appear. Eat to a comfortable fullness — butter, ghee and tallow are your friends."
    );
  }
  if (intake.goal === "lose-weight") {
    notes.push(
      "Because fat loss is your goal, we've left out starches and weight-gain carbs like banana and honey. Protein, natural fats, and well-cooked vegetables do the work this week — skip snacking on fruit."
    );
  }
  if (intake.goal === "more-energy") {
    notes.push(
      "For energy: salt every meal, don't fear fat, and keep protein steady through the day. If afternoons crash, the free call is where we troubleshoot."
    );
  }
  if (intake.goal === "calm-symptoms") {
    notes.push(
      "Symptom-calm week: keep meals boring on purpose. If something worsens symptoms, drop it and note it for your call."
    );
  }
  if (!activeFlareNote(intake)) {
    const nightshade = intake.restrictions.includes("nightshade-free");
    notes.push(
      nightshade
        ? "We've woven in a gentle fermented ladder — tiny sauerkraut first, then brine pickles (not achar). Kimchi stays out while nightshades are off the table."
        : "We've woven in a gentle fermented ladder — tiny sauerkraut early in the week, then pickles or mild kimchi. Start small and only keep what your gut tolerates."
    );
  }
  if (dairyFree) {
    notes.push(
      "Dairy is out, so fats come from tallow, olive oil and egg yolks where they fit. Bone broth becomes even more useful for you."
    );
  }
  if (stats?.thinPool) {
    notes.push(
      "Your combination of diet style and restrictions shrinks the safe meal pool — you may see similar anchors repeated. That's caution, not laziness; a personalised call widens options safely."
    );
  }
  const enjoys = parseFoodList(intake.loves || "");
  if (enjoys.length) {
    notes.push(
      `You mentioned you enjoy ${enjoys.join(", ")} — we biased the week toward those where they fit the green or yellow tiers.`
    );
  }
  for (const flag of brief?.safetyFlags ?? []) {
    notes.push(`Important: ${flag}`);
  }

  notes.push(
    `${first}, this is deliberately generic and cautious. The real work is drawing your personal map — your history, your labs, the way your body responds this week. That's what a free strategy call is for.`
  );
  return notes;
}

function activeFlareNote(intake: Intake): boolean {
  return intake.flareState === "active-flare";
}

function labelFrequency(f: Intake["meatFrequency"]): string {
  switch (f) {
    case "daily":
      return "most days";
    case "few-times-week":
      return "a few times a week";
    case "weekly":
      return "about once a week";
    case "rarely":
      return "rarely";
    case "never":
      return "never";
    default:
      return "sometimes";
  }
}

function buildShoppingList(days: DayPlan[]): string[] {
  const map = new Map<string, number>();
  const normalize = (raw: string) => {
    let s = raw.toLowerCase().replace(/\s+/g, " ").trim();
    s = s.replace(/^(a |an |the |small |large |few |optional:?\s*)+/i, "");
    s = s.replace(/\([^)]*\)/g, "").trim();
    // Collapse quantities like "3 eggs..." → eggs
    if (/\beggs?\b/.test(s)) return "Eggs";
    if (/butter|ghee/.test(s)) return "Butter / ghee";
    if (/tallow/.test(s)) return "Beef tallow";
    if (/sea salt|pinch of salt|salt/.test(s)) return "Sea salt";
    if (/bone broth|broth/.test(s)) return "Bone broth";
    if (/ribeye|steak/.test(s)) return "Ribeye / steak";
    if (/ground beef|beef patt/.test(s)) return "Ground beef";
    if (/\blamb\b/.test(s)) return "Lamb";
    if (/chicken/.test(s)) return "Chicken thighs";
    if (/salmon/.test(s)) return "Salmon";
    if (/sardine/.test(s)) return "Sardines (tinned in olive oil)";
    if (/mackerel/.test(s)) return "Mackerel";
    if (/zucchini|courgette/.test(s)) return "Zucchini / courgette";
    if (/green beans/.test(s)) return "Green beans";
    if (/spinach/.test(s)) return "Spinach";
    if (/asparagus/.test(s)) return "Asparagus tips";
    if (/squash/.test(s)) return "Squash (peeled)";
    if (/carrot/.test(s)) return "Carrots (to peel & cook)";
    if (/sauerkraut/.test(s)) return "Sauerkraut";
    if (/kimchi/.test(s)) return "Mild kimchi";
    if (/pickle/.test(s)) return "Brine cucumber pickles (not achar)";
    if (/cheese/.test(s)) return "Aged hard cheese";
    if (/yoghurt|yogurt/.test(s)) return "Full-fat plain yoghurt";
    if (/\brice\b/.test(s)) return "White rice";
    if (/banana/.test(s)) return "Ripe bananas";
    if (/honey/.test(s)) return "Raw honey";
    if (/olive oil/.test(s)) return "Olive oil";
    if (/macadamia|almond|nuts/.test(s)) return "Macadamias or almonds (small pack)";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  for (const day of days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const key = normalize(item);
        if (!key || key.length < 3) continue;
        if (/your tolerated|green-tier protein|natural fat|optional/i.test(key))
          continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name]) => name)
    .slice(0, 28);
}

function buildPrepTips(intake: Intake, days: DayPlan[]): string[] {
  const blob = days
    .flatMap((d) => d.meals.flatMap((m) => [m.title, ...m.items]))
    .join(" ")
    .toLowerCase();
  const tips: string[] = [];
  if (/ground beef|beef patt/.test(blob)) {
    tips.push("Batch-cook 1–1.5 kg ground beef in tallow mid-week — reheats cleanly for lunches.");
  }
  if (/bone broth|broth/.test(blob)) {
    tips.push("Simmer a pot of bone broth once and freeze mug-sized portions for snacks.");
  }
  if (/chicken/.test(blob)) {
    tips.push("Roast a tray of chicken thighs with skin on — eat hot night one, cold or rewarmed later.");
  }
  if (/zucchini|green beans|spinach|courgette/.test(blob)) {
    tips.push("Prep veg the day you buy it: wash, then cook soft in butter/ghee (or olive oil if dairy-free) until melting — no crunchy leftovers.");
  }
  if (/sauerkraut|kimchi|pickle/.test(blob)) {
    tips.push("Keep ferments fridge-cold and serve teaspoons only at first — dose up only if symptoms stay calm.");
  }
  if (intake.goal === "gain-weight" && /\brice\b/.test(blob)) {
    tips.push("Cook a pot of soft white rice every 2–3 days; reheat with extra ghee or broth.");
  }
  if (!tips.length) {
    tips.push("Cook once, eat twice: double dinner protein and use leftovers for the next lunch.");
  }
  return tips.slice(0, 5);
}

function buildSwaps(intake: Intake): string[] {
  const swaps: string[] = [];
  if (intake.dietType !== "vegetarian") {
    swaps.push("No lamb → fatty ground beef or ribeye.");
    swaps.push("No salmon → sardines or mackerel.");
  }
  if (!intake.restrictions.includes("egg-free")) {
    swaps.push("No ribeye / chicken tonight → eggs + aged cheese (if dairy is ok).");
  }
  if (!intake.restrictions.includes("dairy-free")) {
    swaps.push("No butter → ghee; no yoghurt → aged hard cheese.");
  } else {
    swaps.push("No butter/ghee → cook in tallow or olive oil.");
  }
  if (intake.dietType === "vegetarian") {
    swaps.push("No zucchini → soft green beans or wilted spinach (well-cooked).");
  }
  swaps.push("Any ferment flares you → drop it immediately and note it for your call.");
  if (intake.goal === "gain-weight") {
    swaps.push("No rice → soft cooked squash with lots of fat (still gentler than fruit juice).");
  }
  return swaps.slice(0, 6);
}
