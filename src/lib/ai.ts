import { config } from "./config";
import { FOODS, PREFERRED_SWEETENERS } from "./foodGuide";
import { digestIntake } from "./digest";
import { generateMealPlan } from "./mealPlan";
import { Intake, IntakeBrief, MealPlan } from "./types";

/**
 * Two-stage pipeline:
 *   1. DIGEST — interpret the whole form (incl. free text) into a structured
 *      brief (see digest.ts). Works with or without OpenAI.
 *   2. GENERATE — write the 7-day plan from that brief. Uses OpenAI when a key
 *      is set; otherwise the deterministic rules engine. The brief feeds BOTH
 *      so personalization improves either way. Any failure falls back safely so
 *      an order is never left unfulfilled.
 */
export async function generatePlan(intake: Intake): Promise<MealPlan> {
  const brief = await digestIntake(intake);

  if (!config.openai.enabled) {
    return generateMealPlan(intake, brief);
  }
  try {
    return await generateWithOpenAI(intake, brief);
  } catch (err) {
    console.error("[ai] falling back to rules engine:", err);
    return generateMealPlan(intake, brief);
  }
}

function buildSystemPrompt(): string {
  const green = FOODS.filter((f) => f.tier === "green").map((f) => f.name);
  const yellow = FOODS.filter((f) => f.tier === "yellow").map((f) => f.name);
  const red = FOODS.filter((f) => f.tier === "red").map((f) => f.name);

  return `You are writing a 7-day meal plan in the voice of Sameer Dossani, PhD — "Gut Freedom". Your approach is ancestral and evidence-informed for people with Crohn's, colitis and IBD.

VOICE: honest, warm, direct, first-principles. Signature ideas: "a starting map, not a life sentence", "heal, don't just suppress", "your genetics are not your destiny". No hype. Never promise a cure.

TRAFFIC-LIGHT RULES (do not violate):
- GREEN (foundation, use most): ${green.join(", ")}.
- YELLOW (test carefully, small amounts, only if not in an active flare): ${yellow.join(", ")}.
- RED (never include): ${red.join(", ")}.
- Preferred sweeteners if needed: ${PREFERRED_SWEETENERS.join(", ")}.
- In an active flare: GREEN foods only — no fermented vegetable sides during an active flare.
- Respect the user's diet type, meat frequency, dislikes and dietary restrictions strictly.
- You are given a DIGEST of the person's form: honor avoidFoods and inferredRestrictions strictly, lean into emphasizeFoods where they fit, and if there are safetyFlags, add a clear, caring note in personalNotes urging them to talk to Sameer and their doctor.

MEAL-PLAN QUALITY RULES (must follow):
- Variety: meals must look clearly different day to day. Do not repeat the same breakfast/lunch/dinner title across the week unless the pool is tiny.
- Weight loss: if goal is lose-weight, NEVER include bananas, honey, white rice, or other starch/weight-gain carbs. Anchor on protein, natural fats, and well-cooked vegetables.
- Vegetarians: include more well-cooked above-ground vegetables (zucchini, green beans, soft spinach, asparagus tips) cooked in butter/ghee. For vegetarian + weight loss, that pattern is the centre of the plate — not fruit or rice.
- Ferments for everyone (when not in active flare): include small sides of sauerkraut, mild kimchi, or brine cucumber pickles (NOT achar / spicy Indian pickle). Start tiny.

Return ONLY valid JSON matching this TypeScript type (no markdown):
{
  "headline": string,
  "intro": string,
  "days": { "day": number, "label": string, "meals": { "slot": "Breakfast"|"Lunch"|"Dinner"|"Snack", "title": string, "items": string[], "note"?: string }[] }[],
  "greenFoundation": string[],
  "testCarefully": string[],
  "skipForNow": string[],
  "hydrationAndSalt": string,
  "personalNotes": string[],
  "disclaimer": string
}
The plan MUST have exactly 7 days. Keep meals simple and realistic.`;
}

async function generateWithOpenAI(
  intake: Intake,
  brief: IntakeBrief
): Promise<MealPlan> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: `DIGEST of the form:\n${JSON.stringify(
            brief,
            null,
            2
          )}\n\nRaw intake:\n${JSON.stringify(intake, null, 2)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty completion");

  const parsed = JSON.parse(content) as Partial<MealPlan>;
  if (!parsed.days || parsed.days.length !== 7) {
    throw new Error("model did not return 7 days");
  }

  // Merge with rules-based defaults for any missing sections.
  const fallback = generateMealPlan(intake, brief);
  return {
    headline: parsed.headline ?? fallback.headline,
    intro: parsed.intro ?? fallback.intro,
    days: parsed.days,
    greenFoundation: parsed.greenFoundation ?? fallback.greenFoundation,
    testCarefully: parsed.testCarefully ?? fallback.testCarefully,
    skipForNow: parsed.skipForNow ?? fallback.skipForNow,
    hydrationAndSalt: parsed.hydrationAndSalt ?? fallback.hydrationAndSalt,
    personalNotes: parsed.personalNotes ?? fallback.personalNotes,
    disclaimer: fallback.disclaimer,
    generatedBy: "ai",
    digestedBy: brief.digestedBy,
  };
}
