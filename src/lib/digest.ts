import { config } from "./config";
import { heuristicFromPartial } from "./formIntelligence";
import { Intake, IntakeBrief, Restriction } from "./types";

/**
 * The "digest" stage: read the whole form — including the free-text loves,
 * dislikes and notes — and turn it into a clean, structured brief that drives
 * personalization.
 *
 * Uses OpenAI when a key is configured (real language understanding). Falls back
 * to a lightweight heuristic parser otherwise, so the app still extracts useful
 * signal with zero external dependencies.
 */
export async function digestIntake(intake: Intake): Promise<IntakeBrief> {
  if (config.openai.enabled) {
    try {
      return await digestWithOpenAI(intake);
    } catch (err) {
      console.error("[digest] AI digest failed, using heuristic:", err);
    }
  }
  return heuristicDigest(intake);
}

/* ----------------------------- AI digest ----------------------------- */

const VALID_RESTRICTIONS: Restriction[] = [
  "dairy-free",
  "egg-free",
  "fish-shellfish-free",
  "pork-free",
  "nut-free",
  "nightshade-free",
  "no-added-sugar",
  "no-caffeine",
];

function digestSystemPrompt(): string {
  return `You interpret an intake form for "Gut Freedom", an ancestral, evidence-informed IBD nutrition program (Crohn's, colitis, IBD). Read EVERYTHING the person wrote, including free-text fields, and extract clean structured signal. Do not invent facts.

Return ONLY valid JSON (no markdown) matching:
{
  "avoidFoods": string[],          // specific foods to exclude, normalized & lowercase (from dislikes + notes, e.g. "dairy bloats me" -> "dairy", "milk", "cheese")
  "emphasizeFoods": string[],      // foods they enjoy to feature where they fit the plan
  "inferredRestrictions": string[],// ONLY from this set: ${VALID_RESTRICTIONS.join(", ")}. Infer from free text (e.g. "lactose intolerant" -> "dairy-free").
  "safetyFlags": string[],         // short phrases for anything needing extra caution / a real consult: pregnancy or breastfeeding, medications (e.g. prednisone, biologics), other diagnoses, recent surgery, severe/bloody symptoms, being severely underweight, under 18, etc. Empty array if none.
  "summary": string                // one warm sentence describing this person and what they need.
}

Be conservative: if unsure whether something is a hard restriction, put the food in avoidFoods rather than inferredRestrictions. Keep arrays short and de-duplicated.`;
}

async function digestWithOpenAI(intake: Intake): Promise<IntakeBrief> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: digestSystemPrompt() },
        {
          role: "user",
          content: `Intake form:\n${JSON.stringify(
            {
              dietType: intake.dietType,
              meatFrequency: intake.meatFrequency,
              flareState: intake.flareState,
              goal: intake.goal,
              restrictions: intake.restrictions,
              loves: intake.loves,
              dislikes: intake.dislikes,
              notes: intake.notes,
              age: intake.age,
              sex: intake.sex,
              weight: intake.weight,
              height: intake.height,
              unit: intake.unit,
              cookingConfidence: intake.cookingConfidence,
            },
            null,
            2
          )}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty digest completion");

  const parsed = JSON.parse(content) as Record<string, unknown>;
  return normalizeBrief(parsed, "ai");
}

function normalizeBrief(
  raw: Record<string, unknown>,
  digestedBy: "ai" | "heuristic"
): IntakeBrief {
  const strArr = (v: unknown, max = 20): string[] =>
    Array.isArray(v)
      ? Array.from(
          new Set(
            v
              .filter((x): x is string => typeof x === "string")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          )
        ).slice(0, max)
      : [];

  const inferred = strArr(raw.inferredRestrictions).filter((r): r is Restriction =>
    (VALID_RESTRICTIONS as string[]).includes(r)
  ) as Restriction[];

  return {
    avoidFoods: strArr(raw.avoidFoods),
    emphasizeFoods: strArr(raw.emphasizeFoods),
    inferredRestrictions: inferred,
    safetyFlags:
      Array.isArray(raw.safetyFlags)
        ? (raw.safetyFlags
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 10) as string[])
        : [],
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
    digestedBy,
  };
}

function heuristicDigest(intake: Intake): IntakeBrief {
  const raw = heuristicFromPartial(intake);
  return normalizeBrief(raw, "heuristic");
}
