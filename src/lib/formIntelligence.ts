import { DietType, FlareState, PrimaryGoal, Restriction } from "./types";

/** Partial form state — safe to call from the client as the user types. */
export interface PartialFormInput {
  name?: string;
  dietType?: DietType | "";
  meatFrequency?: string;
  loves?: string;
  dislikes?: string;
  restrictions?: string[];
  flareState?: FlareState | "" | string;
  goal?: PrimaryGoal | "" | string;
  notes?: string;
  age?: number | string;
}

export interface FormInsights {
  inferredRestrictions: Restriction[];
  avoidFoods: string[];
  emphasizeFoods: string[];
  safetyFlags: string[];
  /** Short, friendly lines to show under text fields as the user types. */
  liveAcknowledgments: string[];
  /** Warnings about contradictory answers. */
  contradictions: string[];
  showConsultNudge: boolean;
  /** One-line plan strategy for the review screen. */
  planStrategy: string;
}

const RESTRICTION_LABELS: Record<Restriction, string> = {
  "dairy-free": "Dairy-free",
  "egg-free": "Egg-free",
  "fish-shellfish-free": "No fish / shellfish",
  "pork-free": "No pork",
  "nut-free": "Nut-free",
  "nightshade-free": "No nightshades",
  "no-added-sugar": "No added sugar",
  "no-caffeine": "No caffeine",
};

const FILLER_EXACT = new Set([
  "no",
  "nothing",
  "none",
  "n/a",
  "na",
  "nil",
  "nope",
  "nah",
  "idk",
  "dunno",
  "skip",
  "pass",
  "-",
  "--",
  ".",
  "...",
  "whatever",
  "anything",
  "everything",
  "all",
  "unsure",
  "not sure",
  "no idea",
  "no preference",
  "no preferences",
  "negative",
  "zero",
  "empty",
  "blank",
  "not applicable",
  "not really",
  "nothing really",
  "no thanks",
  "no comment",
  "no specific",
  "no particular",
  "don't know",
  "dont know",
  "doesn't matter",
  "doesnt matter",
  "don't mind",
  "dont mind",
  "anything goes",
  "all good",
  "same",
  "none really",
  "nothing specific",
  "nothing particular",
  "no strong preference",
  "no strong preferences",
]);

const FILLER_PATTERNS = [
  /^no(things?)?\s*(really|particular|specific|preference|preferences)?$/i,
  /^n\/?a$/i,
  /^not\s+(sure|really|applicable|much)$/i,
  /^don'?t\s+(know|have|mind|care)$/i,
  /^doesn'?t\s+matter$/i,
  /^nothing\s+(really|specific|particular|comes\s+to\s+mind)$/i,
  /^none\s*(really|specific|particular)?$/i,
  /^all\s+good$/i,
  /^i\s+don'?t\s+(know|have|really)/i,
  /^can'?t\s+think/i,
  /^no\s+strong/i,
  /^not\s+really$/i,
  /^nothing\s+to\s+(add|say)$/i,
];

function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/[.!?,…]+$/, "");
}

/** True when a single token is empty filler ("no", "nothing", "n/a", etc.). */
export function isFillerToken(token: string): boolean {
  const t = normalizeToken(token);
  if (!t || t.length < 2) return true;
  if (FILLER_EXACT.has(t)) return true;
  return FILLER_PATTERNS.some((p) => p.test(t));
}

/** True when the whole free-text field is only filler or blank. */
export function isFillerField(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return true;
  const normalized = normalizeToken(trimmed);
  if (FILLER_EXACT.has(normalized)) return true;
  if (FILLER_PATTERNS.some((p) => p.test(normalized))) return true;
  const items = trimmed.split(/[,;\n]/).map((w) => w.trim()).filter(Boolean);
  return items.length > 0 && items.every(isFillerToken);
}

/** Parse comma/newline-separated foods, dropping meaningless tokens. */
export function parseFoodList(s: string): string[] {
  if (isFillerField(s)) return [];
  return Array.from(
    new Set(
      s
        .split(/[,;\n]/)
        .map(normalizeToken)
        .filter((w) => w.length > 1 && !isFillerToken(w))
    )
  ).slice(0, 20);
}

/** Drop filler tokens from an already-normalized list (e.g. AI digest output). */
export function filterFoodList(items: string[]): string[] {
  return Array.from(
    new Set(items.map(normalizeToken).filter((w) => w.length > 1 && !isFillerToken(w)))
  ).slice(0, 20);
}

/** For review screens — show parsed foods or a dash when empty/filler. */
export function formatFoodFieldForDisplay(s: string): string {
  const items = parseFoodList(s);
  if (items.length) return items.join(", ");
  if (!s.trim() || isFillerField(s)) return "—";
  return s.trim();
}

interface Signal {
  restriction: Restriction;
  triggers: string[];
}

const RESTRICTION_SIGNALS: Signal[] = [
  { restriction: "dairy-free", triggers: ["dairy", "lactose"] },
  { restriction: "egg-free", triggers: ["egg", "eggs"] },
  { restriction: "fish-shellfish-free", triggers: ["fish", "shellfish", "seafood"] },
  { restriction: "pork-free", triggers: ["pork", "halal", "kosher"] },
  { restriction: "nut-free", triggers: ["nut", "nuts"] },
  { restriction: "nightshade-free", triggers: ["nightshade", "nightshades"] },
  { restriction: "no-caffeine", triggers: ["caffeine"] },
];

const INTOLERANCE_CUES = [
  "intoleran",
  "allergic",
  "allergy",
  "can't have",
  "cant have",
  "cannot have",
  "can't eat",
  "cant eat",
  "avoid",
  "no ",
  "without",
  "bloat",
  "upsets",
  "reacts",
  "makes me",
  "sensitive",
  "triggers",
];

const SAFETY_CUES: { match: string[]; flag: string }[] = [
  { match: ["pregnan"], flag: "Pregnancy mentioned — this tool can't replace individualized guidance." },
  { match: ["breastfeed", "nursing"], flag: "Breastfeeding — nutrient needs are higher; a consult is worth it." },
  {
    match: ["prednisone", "steroid", "biologic", "humira", "remicade", "azathioprine", "mesalazine", "medication", "meds "],
    flag: "Medication mentioned — loop your doctor in before changing diet.",
  },
  { match: ["surgery", "resection", "ostomy", "stoma"], flag: "Surgical history — a personalized call can adapt the plan." },
  { match: ["blood", "bleeding"], flag: "Bleeding mentioned — please contact your medical team promptly." },
  { match: ["diabet"], flag: "Diabetes — carb choices need individual tailoring." },
  { match: ["kidney", "renal"], flag: "Kidney concern — protein and salt need medical input." },
];

/** Restrictions that don't apply given the eating style. */
export function relevantRestrictions(dietType: DietType | ""): Restriction[] {
  const all = Object.keys(RESTRICTION_LABELS) as Restriction[];
  if (dietType === "vegetarian") {
    return all.filter((r) => r !== "pork-free" && r !== "fish-shellfish-free");
  }
  return all;
}

export function restrictionLabel(r: Restriction): string {
  return RESTRICTION_LABELS[r];
}

/** Analyze partial or complete form input — powers live UI and server digest. */
export function analyzeFormInput(input: PartialFormInput): FormInsights {
  const dislikes = (input.dislikes || "").toLowerCase();
  const notes = (input.notes || "").toLowerCase();
  const loves = (input.loves || "").toLowerCase();
  const free = `${loves} ${dislikes} ${notes}`;
  const explicit = new Set((input.restrictions ?? []) as Restriction[]);

  const avoidFoods = parseFoodList(input.dislikes || "");
  const emphasizeFoods = parseFoodList(input.loves || "");

  const inferred = new Set<Restriction>();
  const hasIntoleranceCue = INTOLERANCE_CUES.some((c) => free.includes(c));
  for (const sig of RESTRICTION_SIGNALS) {
    const inFree = sig.triggers.some((t) => containsWord(free, t));
    const inDislikes = sig.triggers.some((t) => containsWord(dislikes, t));
    if (inDislikes || (inFree && hasIntoleranceCue)) {
      inferred.add(sig.restriction);
    }
  }

  const safetyFlags: string[] = [];
  for (const s of SAFETY_CUES) {
    if (s.match.some((m) => free.includes(m))) safetyFlags.push(s.flag);
  }
  const age = Number(input.age);
  if (Number.isFinite(age) && age > 0 && age < 18) {
    safetyFlags.push("Under 18 — this tool is designed for adults.");
  }

  const contradictions = detectContradictions(input);
  const liveAcknowledgments = buildAcknowledgments(input, {
    inferred: Array.from(inferred),
    explicit,
    avoidFoods,
    emphasizeFoods,
    safetyFlags,
    contradictions,
  });

  return {
    inferredRestrictions: Array.from(inferred),
    avoidFoods,
    emphasizeFoods,
    safetyFlags,
    liveAcknowledgments,
    contradictions,
    showConsultNudge: safetyFlags.length > 0 || input.flareState === "active-flare",
    planStrategy: buildPlanStrategy(input, inferred, explicit),
  };
}

function buildAcknowledgments(
  input: PartialFormInput,
  ctx: {
    inferred: Restriction[];
    explicit: Set<Restriction>;
    avoidFoods: string[];
    emphasizeFoods: string[];
    safetyFlags: string[];
    contradictions: string[];
  }
): string[] {
  const lines: string[] = [];
  const first = firstName(input.name);

  const newInferred = ctx.inferred.filter((r) => !ctx.explicit.has(r));
  if (newInferred.length) {
    lines.push(
      `Sounds like ${newInferred.map(restrictionLabel).join(" and ")} — we'll factor that in.`
    );
  }
  if (ctx.avoidFoods.length) {
    lines.push(`We'll leave out ${ctx.avoidFoods.slice(0, 4).join(", ")}.`);
  }
  if (ctx.emphasizeFoods.length) {
    lines.push(`We'll lean into ${ctx.emphasizeFoods.slice(0, 4).join(", ")} where they fit.`);
  }
  if (input.flareState === "active-flare") {
    lines.push("Active flare — we'll keep this week strictly on the green foundation.");
  }
  if (input.dietType === "vegetarian") {
    lines.push("Vegetarian — we'll anchor on eggs and fermented dairy where tolerated.");
  }
  for (const c of ctx.contradictions) lines.push(c);
  for (const s of ctx.safetyFlags.slice(0, 2)) lines.push(s);
  if (first && lines.length === 0) {
    const lovesText = (input.loves || "").trim();
    const dislikesText = (input.dislikes || "").trim();
    const typedSomething = lovesText || dislikesText;
    const onlyFiller =
      typedSomething &&
      (!lovesText || isFillerField(lovesText)) &&
      (!dislikesText || isFillerField(dislikesText));
    if (typedSomething && !onlyFiller) {
      lines.push(`${first}, tell us in plain language — we'll read between the lines.`);
    }
  }
  return lines.slice(0, 5);
}

function buildPlanStrategy(
  input: PartialFormInput,
  inferred: Set<Restriction>,
  explicit: Set<Restriction>
): string {
  const parts: string[] = [];
  if (input.flareState === "active-flare") {
    parts.push("a strict green-only week to calm things down");
  } else if (input.flareState === "calm") {
    parts.push("a green foundation with a few yellow foods to test");
  } else {
    parts.push("a cautious green-first week");
  }

  if (input.dietType === "meat-eater") parts.push("built around ruminant meat, eggs and fatty fish");
  else if (input.dietType === "semi-vegetarian") parts.push("spacing meat and fish across the week");
  else if (input.dietType === "vegetarian") parts.push("anchored on eggs and fermented dairy");

  const allRestrictions = new Set([...explicit, ...inferred]);
  if (allRestrictions.has("dairy-free")) parts.push("with no dairy");
  if (input.goal === "gain-weight") parts.push("and extra gentle starches for weight");
  if (input.goal === "lose-weight") parts.push("keeping starches minimal");

  return `We're building ${parts.join(", ")}.`;
}

function detectContradictions(input: PartialFormInput): string[] {
  const issues: string[] = [];
  const loves = (input.loves || "").toLowerCase();

  if (input.dietType === "vegetarian") {
    const meatWords = ["beef", "lamb", "ribeye", "steak", "chicken", "salmon", "fish", "sardine", "bacon", "pork"];
    const hit = meatWords.filter((w) => containsWord(loves, w));
    if (hit.length) {
      issues.push(
        `You chose vegetarian but mentioned ${hit.join(", ")} — we'll prioritize eggs and dairy, but a call can help bridge the gap.`
      );
    }
  }

  if (input.restrictions?.includes("egg-free") && containsWord(loves, "egg")) {
    issues.push("You enjoy eggs but marked egg-free — we'll follow the restriction.");
  }
  if (input.restrictions?.includes("dairy-free") && /\b(cheese|yoghurt|yogurt|milk|butter)\b/i.test(loves)) {
    issues.push("You enjoy dairy but marked dairy-free — we'll follow the restriction.");
  }

  const overlap = parseFoodList(input.loves || "").filter((f) =>
    parseFoodList(input.dislikes || "").some((d) => d.includes(f) || f.includes(d))
  );
  if (overlap.length) {
    issues.push(`"${overlap[0]}" appears in both enjoys and avoids — we'll leave it out to be safe.`);
  }

  return issues;
}

/** Dynamic placeholders tuned to eating style. */
export function smartPlaceholders(dietType: DietType | ""): {
  loves: string;
  dislikes: string;
  notes: string;
} {
  switch (dietType) {
    case "vegetarian":
      return {
        loves: "e.g. eggs, aged cheese, butter, white rice…",
        dislikes: "e.g. certain vegetables, fermented dairy…",
        notes: "e.g. egg intolerance, travel schedule, medications…",
      };
    case "semi-vegetarian":
      return {
        loves: "e.g. salmon, eggs, roast chicken, ribeye…",
        dislikes: "e.g. organ meats, sardines, lamb…",
        notes: "e.g. dairy bloats me, on mesalazine, cook once a week…",
      };
    case "meat-eater":
      return {
        loves: "e.g. ribeye, eggs, salmon, bone broth, ghee…",
        dislikes: "e.g. organ meats, sardines, nightshades…",
        notes: "e.g. in a flare, on prednisone, breastfeeding…",
      };
    default:
      return {
        loves: "e.g. eggs, salmon, ribeye, aged cheese…",
        dislikes: "e.g. foods that bloat you or you can't tolerate…",
        notes: "e.g. medications, other conditions, cooking constraints…",
      };
  }
}

export function firstName(name?: string): string {
  const n = (name || "").trim().split(/\s+/)[0];
  return n || "";
}

export function greeting(name?: string): string {
  const f = firstName(name);
  return f ? `Hi ${f}` : "Hi there";
}

function containsWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

/** Heuristic digest payload — shared with server digest.ts */
export function heuristicFromPartial(input: PartialFormInput) {
  const insights = analyzeFormInput(input);
  return {
    avoidFoods: insights.avoidFoods,
    emphasizeFoods: insights.emphasizeFoods,
    inferredRestrictions: insights.inferredRestrictions,
    safetyFlags: insights.safetyFlags.map((f) =>
      f.replace(" mentioned", " — needs individualized, supervised guidance.")
    ),
    summary: insights.planStrategy,
  };
}
