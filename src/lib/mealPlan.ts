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

  // ---------------- Lunch ----------------
  {
    slot: "Lunch",
    title: "Roast chicken & broth",
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
    title: "Three-egg scramble in ghee",
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

  // ---------------- Dinner ----------------
  {
    slot: "Dinner",
    title: "Ribeye & butter",
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
    title: "Beef patties in tallow",
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
    title: "Baked salmon",
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
    title: "Omelette & cheese",
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

  // ---------------- Snacks ----------------
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
  const wantsGain = intake.goal === "gain-weight";
  const wantsLose = intake.goal === "lose-weight";

  const dislikeWords = [
    ...parseFoodList(intake.dislikes || ""),
    ...filterFoodList(brief?.avoidFoods ?? []),
  ];

  function allowed(t: Template): boolean {
    if (!t.diet.includes(intake.dietType)) return false;
    if (t.requires.some((req) => blockedReqs.has(req))) return false;
    if (activeFlare && t.tier !== "green") return false;
    if (t.goalOnly === "gain-weight" && !wantsGain) return false;
    if (t.goalOnly === "lose-weight" && !wantsLose) return false;
    // Weight loss: no starches / bananas / honey-style carbs
    if (wantsLose && (t.requires.includes("starch") || t.requires.includes("carb"))) {
      return false;
    }
    const hay = (t.title + " " + t.items.join(" ")).toLowerCase();
    if (dislikeWords.some((w) => w.length > 2 && hay.includes(w))) return false;
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
        "Optional: a few brine pickles",
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
  const usedTitles = new Set<string>();
  let fermentSideIdx = 0;

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

    const unused = candidates.filter((c) => !usedTitles.has(c.title));
    const shortlist = unused.length ? unused : candidates;
    // Spread days across the shortlist so consecutive days look different.
    const chosen = shortlist[(day * 5 + slotIndex(slot) + shortlist.length) % shortlist.length];
    usedTitles.add(chosen.title);
    if (chosen.flesh) fleshLeft--;
    return chosen;
  }

  function toMeal(t: Template, day: number): Meal {
    const items = [...t.items];
    // For calm weeks, gently rotate an extra fermented mention on some dinners
    // when the template doesn't already include one.
    const alreadyFermented = items.some((i) =>
      /sauerkraut|kimchi|pickle/i.test(i)
    );
    if (
      !activeFlare &&
      t.slot === "Dinner" &&
      !alreadyFermented &&
      day % 3 === 0
    ) {
      items.push(FERMENTED_SIDES[fermentSideIdx % FERMENTED_SIDES.length]);
      fermentSideIdx++;
    }
    return {
      slot: t.slot,
      title: t.title,
      items,
      note: t.note,
    };
  }

  const days: DayPlan[] = [];
  for (let d = 0; d < 7; d++) {
    const meals: Meal[] = [];
    for (const slot of ["Breakfast", "Lunch", "Dinner"] as const) {
      const chosen = choose(pool[slot], d, slot);
      if (!chosen) {
        meals.push(safeFallback[slot]);
        continue;
      }
      meals.push(toMeal(chosen, d));
    }
    // Snack most days so fermented snacks also rotate in.
    if (d % 2 === 0 && pool.Snack.length) {
      const s = choose(pool.Snack, d, "Snack");
      if (s) meals.push(toMeal(s, d));
    }
    days.push({
      day: d + 1,
      label: `Day ${d + 1} · ${DAY_NAMES[d]}`,
      meals,
    });
  }

  return {
    headline: `${intake.name ? intake.name.split(" ")[0] + "'s" : "Your"} 7-Day Gut Freedom Starter Plan`,
    intro: buildIntro(intake),
    days,
    greenFoundation: greenFoundationFor(intake),
    testCarefully: [
      "Aged / fermented dairy",
      "Small amounts of fermented vegetables — sauerkraut, mild kimchi, brine cucumber pickles (not achar)",
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
    personalNotes: buildPersonalNotes(intake, brief),
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
  return `Hi ${first} — think of this as a starting map, not a life sentence. ${flareLine} Eat to appetite, salt your food, and pay attention to how each day feels.`;
}

function greenFoundationFor(intake: Intake): string[] {
  if (intake.dietType === "vegetarian") {
    const veg = [
      "Eggs and egg yolks",
      "Fermented / aged dairy and natural fats (butter, ghee) if tolerated",
      "Well-cooked above-ground vegetables in butter or ghee (zucchini, green beans, soft spinach)",
      "Sea salt and plenty of water",
    ];
    if (intake.goal === "gain-weight") {
      veg.splice(2, 0, "White rice for gentle energy while you build weight");
    }
    return veg;
  }
  const base = [
    "Ruminant meat — beef, lamb (fatty cuts are your friend)",
    "Fatty fish — salmon, sardines, mackerel",
    "Eggs, poultry, and animal fats (tallow, ghee, butter)",
    "Bone broth, sea salt and water",
    "Small fermented sides when calm — sauerkraut, mild kimchi, brine pickles (not achar)",
  ];
  if (intake.goal === "gain-weight") {
    base.push("White rice — a gentle source of energy while you build weight");
  }
  return base;
}

function buildPersonalNotes(intake: Intake, brief?: IntakeBrief): string[] {
  const notes: string[] = [];
  const first = intake.name ? intake.name.split(" ")[0] : "you";

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
    if (intake.goal === "lose-weight") {
      notes.push(
        "You're vegetarian and aiming for fat loss, so this week centres on eggs, fermented dairy, and above-ground vegetables cooked soft in butter or ghee — not bananas or rice."
      );
    } else {
      notes.push(
        "You're eating vegetarian, so this plan leans on eggs, fermented dairy, and well-cooked vegetables in butter/ghee. Honest note: the ancestral foundation is animal-based, and a fully plant-based version has real gaps for an inflamed gut. This is where a quick call with Sameer can help you close those gaps safely."
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
      "Because you want to gain weight, we've included white rice and generous fats. Eat to a comfortable fullness, and don't be shy with butter, ghee and tallow."
    );
  }
  if (intake.goal === "lose-weight") {
    notes.push(
      "Because fat loss is your goal, we've left out starches and weight-gain carbs like banana and honey. Protein, natural fats, and well-cooked vegetables do the work this week."
    );
  }
  if (!activeFlareNote(intake)) {
    notes.push(
      "We've woven in small fermented sides — sauerkraut, mild kimchi, or brine cucumber pickles (not achar). Start tiny and only keep what your gut tolerates."
    );
  }
  if (intake.restrictions.includes("dairy-free")) {
    notes.push(
      "Dairy is out, so fats come from tallow, ghee-free cooking and egg yolks. Bone broth becomes even more useful for you."
    );
  }
  const enjoys = parseFoodList(intake.loves || "");
  if (enjoys.length) {
    notes.push(
      `You mentioned you enjoy ${enjoys.join(", ")} — where those fit the green or yellow tiers, lean into them; where they don't, that's a great thing to talk through on a call.`
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
