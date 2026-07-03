import {
  DayPlan,
  DietType,
  Intake,
  IntakeBrief,
  Meal,
  MealPlan,
  Restriction,
} from "./types";

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
  | "pork";

interface Template {
  slot: Meal["slot"];
  title: string;
  items: string[];
  requires: Req[];
  tier: "green" | "yellow";
  /** which diet types this fits */
  diet: DietType[];
  /** contains animal flesh (used for semi-veg budgeting) */
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

const TEMPLATES: Template[] = [
  // ---------------- Breakfast ----------------
  {
    slot: "Breakfast",
    title: "Eggs & butter",
    items: ["3 eggs cooked in butter or ghee", "Pinch of sea salt"],
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
    title: "Yoghurt & honey bowl",
    items: [
      "Full-fat plain or fermented yoghurt",
      "Drizzle of raw honey",
      "Ripe banana slices",
    ],
    requires: ["dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: keep honey occasional while you're actively healing.",
  },
  {
    slot: "Breakfast",
    title: "Rice porridge with butter",
    items: ["White rice cooked soft in bone broth", "Butter", "Sea salt"],
    requires: ["starch", "dairy"],
    tier: "green",
    diet: ALL,
    goalOnly: "gain-weight",
  },

  // ---------------- Lunch ----------------
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
    title: "Beef & rice bowl",
    items: ["Ground beef in tallow", "White rice", "Sea salt"],
    requires: ["ruminant", "starch"],
    tier: "green",
    diet: ["meat-eater"],
    flesh: true,
  },
  {
    slot: "Lunch",
    title: "Lamb with cooked carrots",
    items: ["Slow-cooked lamb", "Well-cooked peeled carrots in butter"],
    requires: ["ruminant", "dairy"],
    tier: "yellow",
    diet: ["meat-eater"],
    flesh: true,
    note: "Yellow: carrots are a well-cooked, peeled vegetable — test how you respond.",
  },
  {
    slot: "Lunch",
    title: "Sardines on rice",
    items: ["Tinned sardines in olive oil", "White rice", "Sea salt"],
    requires: ["fish", "starch"],
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
    title: "Egg & rice bowl",
    items: ["Soft-cooked eggs over white rice", "Ghee", "Sea salt"],
    requires: ["eggs", "starch", "dairy"],
    tier: "green",
    diet: ALL,
  },
  {
    slot: "Lunch",
    title: "Cheese & egg plate",
    items: ["Aged hard cheese", "2 boiled eggs", "Butter"],
    requires: ["dairy", "eggs"],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: aged cheese is easier thanks to fermentation and low lactose.",
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
    note: "Yellow: cooked & peeled squash — a gentle, low-fiber plant to test.",
  },

  // ---------------- Dinner ----------------
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
    title: "Baked salmon",
    items: ["Baked salmon with butter", "Warm bone broth on the side"],
    requires: ["fish", "dairy"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Mackerel & rice",
    items: ["Grilled mackerel", "White rice", "Sea salt"],
    requires: ["fish", "starch"],
    tier: "green",
    diet: OMNI,
    flesh: true,
  },
  {
    slot: "Dinner",
    title: "Chicken thighs & squash",
    items: [
      "Roasted chicken thighs",
      "Cooked, peeled squash in ghee",
    ],
    requires: ["poultry", "dairy"],
    tier: "yellow",
    diet: OMNI,
    flesh: true,
    note: "Yellow: squash is a low-fiber cooked plant to test in.",
  },
  {
    slot: "Dinner",
    title: "Omelette & cheese",
    items: [
      "Large 3-egg omelette in butter",
      "Melted aged cheese",
    ],
    requires: ["eggs", "dairy"],
    tier: "yellow",
    diet: ALL,
    note: "Vegetarian-friendly protein anchor built on eggs and fermented dairy.",
  },
  {
    slot: "Dinner",
    title: "Egg & rice comfort bowl",
    items: [
      "Soft-cooked eggs over white rice",
      "Ghee and sea salt",
    ],
    requires: ["eggs", "starch", "dairy"],
    tier: "green",
    diet: ALL,
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
    title: "Ripe banana",
    items: ["1 ripe banana"],
    requires: [],
    tier: "yellow",
    diet: ALL,
    note: "Yellow: a gentle fruit — keep it occasional.",
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
  // weekly count of meals that contain animal flesh (beef/lamb/poultry/fish)
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

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateMealPlan(
  intake: Intake,
  brief?: IntakeBrief
): MealPlan {
  const blockedReqs = new Set<Req>();
  // Explicit restrictions from the form...
  for (const r of intake.restrictions) {
    const req = RESTRICTION_TO_REQ[r];
    if (req) blockedReqs.add(req);
  }
  // ...plus restrictions the digest inferred from free text.
  for (const r of brief?.inferredRestrictions ?? []) {
    const req = RESTRICTION_TO_REQ[r];
    if (req) blockedReqs.add(req);
  }

  const activeFlare = intake.flareState === "active-flare";
  const wantsGain = intake.goal === "gain-weight";
  const wantsLose = intake.goal === "lose-weight";

  const dislikeWords = [
    ...(intake.dislikes || "")
      .toLowerCase()
      .split(/[,;\n]/)
      .map((s) => s.trim()),
    // Foods the digest normalized out of the free text.
    ...(brief?.avoidFoods ?? []),
  ].filter(Boolean);

  function allowed(t: Template): boolean {
    if (!t.diet.includes(intake.dietType)) return false;
    if (t.requires.some((req) => blockedReqs.has(req))) return false;
    // In an active flare, keep strictly to the green foundation.
    if (activeFlare && t.tier !== "green") return false;
    // Goal gating for starch-heavy comfort meals.
    if (t.goalOnly === "gain-weight" && !wantsGain) return false;
    if (wantsLose && t.requires.includes("starch")) return false;
    // Honor free-text dislikes.
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

  // Fallback so a slot is never empty (e.g. very restricted vegetarian).
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
      items: ["Your tolerated green-tier protein", "Cooked in a natural animal fat"],
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

  const days: DayPlan[] = [];
  for (let d = 0; d < 7; d++) {
    const meals: Meal[] = [];
    for (const slot of ["Breakfast", "Lunch", "Dinner"] as const) {
      const options = pool[slot];
      if (options.length === 0) {
        meals.push(safeFallback[slot]);
        continue;
      }
      // Prefer non-flesh options once the weekly flesh budget is spent.
      let candidates = options;
      if (fleshLeft <= 0) {
        const nonFlesh = options.filter((o) => !o.flesh);
        if (nonFlesh.length) candidates = nonFlesh;
      }
      const chosen = pick(candidates, d * 3 + slotIndex(slot));
      if (chosen.flesh) fleshLeft--;
      meals.push({
        slot: chosen.slot,
        title: chosen.title,
        items: chosen.items,
        note: chosen.note,
      });
    }
    // Snack every other day to keep things simple.
    if (d % 2 === 0 && pool.Snack.length) {
      const s = pick(pool.Snack, d);
      meals.push({ slot: s.slot, title: s.title, items: s.items, note: s.note });
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
      "Cooked, peeled, low-fiber plants (squash, ripe banana, cooked carrots)",
      "Coffee, small amounts of nuts, nightshades, occasional fruit & honey",
    ],
    skipForNow: [
      "Industrial seed & vegetable oils (canola, sunflower, soybean)",
      "Refined sugar and processed food",
      "Wheat, gluten and other grains",
      "Legumes & beans",
      "Raw and high-fiber vegetables (salads, cruciferous, skins)",
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
  return slot === "Breakfast" ? 0 : slot === "Lunch" ? 1 : 2;
}

function buildIntro(intake: Intake): string {
  const first = intake.name ? intake.name.split(" ")[0] : "there";
  const flareLine =
    intake.flareState === "active-flare"
      ? "Because you told us things are flaring right now, this week stays firmly on the green foundation — nutrient-dense, easy to digest, nothing that feeds the bacteria driving your symptoms."
      : intake.flareState === "calm"
        ? "Since things are relatively calm, we've kept a strong green foundation and gently folded in a few yellow foods for you to test and watch."
        : "We've anchored this week on the green foundation and added a small number of yellow foods to test carefully.";
  return `Hi ${first} — think of this as a starting map, not a life sentence. ${flareLine} Eat to appetite, salt your food, and pay attention to how each day feels.`;
}

function greenFoundationFor(intake: Intake): string[] {
  if (intake.dietType === "vegetarian") {
    return [
      "Eggs and egg yolks",
      "Fermented / aged dairy and natural fats (butter, ghee) if tolerated",
      "White rice for gentle energy (if weight gain is a goal)",
      "Sea salt and plenty of water",
    ];
  }
  const base = [
    "Ruminant meat — beef, lamb (fatty cuts are your friend)",
    "Fatty fish — salmon, sardines, mackerel",
    "Eggs, poultry, and animal fats (tallow, ghee, butter)",
    "Bone broth, sea salt and water",
  ];
  if (intake.goal === "gain-weight") {
    base.push("White rice — a gentle source of energy while you build weight");
  }
  return base;
}

function buildPersonalNotes(intake: Intake, brief?: IntakeBrief): string[] {
  const notes: string[] = [];
  const first = intake.name ? intake.name.split(" ")[0] : "you";

  // Reflect back what the digest understood from the free-text answers, so the
  // plan visibly "listened" rather than ignoring what they wrote.
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
    notes.push(
      "You're eating vegetarian, so this plan leans on eggs and fermented dairy. Honest note: the ancestral foundation is animal-based, and a fully plant-based version has real gaps for an inflamed gut. This is where a quick call with Sameer can help you close those gaps safely."
    );
  }
  if (intake.dietType === "semi-vegetarian") {
    notes.push(
      `You eat meat ${labelFrequency(intake.meatFrequency)}, so we've spaced animal-flesh meals across the week and filled the rest with eggs, fish and fermented dairy where they fit your preferences.`
    );
  }
  if (intake.goal === "gain-weight") {
    notes.push(
      "Because you want to gain weight, we've included white rice and generous fats. Eat to a comfortable fullness, and don't be shy with butter, ghee and tallow."
    );
  }
  if (intake.goal === "lose-weight") {
    notes.push(
      "Because fat loss is your goal, we've kept starches minimal and let protein and natural fats do the work — you don't need the rice."
    );
  }
  if (intake.restrictions.includes("dairy-free")) {
    notes.push(
      "Dairy is out, so fats come from tallow, ghee-free cooking and egg yolks. Bone broth becomes even more useful for you."
    );
  }
  if (intake.loves && intake.loves.trim()) {
    notes.push(
      `You mentioned you enjoy ${intake.loves.trim()} — where those fit the green or yellow tiers, lean into them; where they don't, that's a great thing to talk through on a call.`
    );
  }
  // Safety flags always earn a stronger, explicit consult nudge.
  for (const flag of brief?.safetyFlags ?? []) {
    notes.push(`Important: ${flag}`);
  }

  notes.push(
    `${first}, this is deliberately generic and cautious. The real work is drawing your personal map — your history, your labs, the way your body responds this week. That's what a free strategy call is for.`
  );
  return notes;
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
