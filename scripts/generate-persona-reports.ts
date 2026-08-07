/**
 * Offline persona battery: generate plans, write reports + email HTML,
 * score accuracy. Optional SMTP send (set SEND_EMAIL=1).
 *
 *   node --require ./scripts/load-env.cjs --import tsx scripts/generate-persona-reports.ts
 *   SEND_EMAIL=1 node --require ./scripts/load-env.cjs --import tsx scripts/generate-persona-reports.ts
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { generateMealPlan } from "../src/lib/mealPlan.ts";
import { analyzeFormInput } from "../src/lib/formIntelligence.ts";
import { renderPlanEmail } from "../src/lib/planEmail.ts";
import type { Intake, MealPlan } from "../src/lib/types.ts";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "test-reports");
const SEND_EMAIL = process.env.SEND_EMAIL === "1";

type Persona = {
  id: string;
  email: string;
  name: string;
  age?: number;
  sex?: Intake["sex"];
  dietType: Intake["dietType"];
  meatFrequency: Intake["meatFrequency"];
  flareState: Intake["flareState"];
  goal: Intake["goal"];
  restrictions: Intake["restrictions"];
  loves: string;
  dislikes: string;
  notes: string;
  cookingConfidence?: Intake["cookingConfidence"];
  unit?: Intake["unit"];
  weight?: number;
  height?: number;
  expect: Record<string, boolean>;
};

const PERSONAS: Persona[] = require("./persona-data.json");

function planText(plan: MealPlan) {
  const parts = [
    plan.headline,
    plan.intro,
    ...(plan.personalNotes || []),
    ...(plan.greenFoundation || []),
    ...(plan.testCarefully || []),
    ...plan.days.flatMap((d) =>
      d.meals.flatMap((m) => [m.title, ...m.items, m.note || ""])
    ),
  ];
  return parts.join("\n").toLowerCase();
}

function mealBlob(plan: MealPlan) {
  return plan.days
    .flatMap((d) => d.meals.flatMap((m) => [m.title, ...m.items]))
    .join(" ")
    .toLowerCase();
}

function scorePersona(persona: Persona, plan: MealPlan, insightsNotes: string) {
  const text = planText(plan) + "\n" + insightsNotes.toLowerCase();
  const meals = mealBlob(plan);
  const titles = plan.days.flatMap((d) => d.meals.map((m) => `${m.slot}:${m.title}`));
  const unique = new Set(titles);
  const checks: { id: string; ok: boolean; detail: string }[] = [];
  const e = persona.expect;
  const pass = (id: string, ok: boolean, detail: string) => checks.push({ id, ok, detail });

  if (e.noBanana) pass("noBanana", !meals.includes("banana"), "no banana in meals");
  if (e.noRice) pass("noRice", !/\brice\b/.test(meals), "no rice in meals");
  if (e.noHoney) pass("noHoney", !meals.includes("honey"), "no honey in meals");
  if (e.noEggs) pass("noEggs", !/\begg/.test(meals), "no eggs in meals");
  if (e.noDairy) pass("noDairy", !/(butter|ghee|cheese|yoghurt|yogurt)/.test(meals), "no dairy in meals");
  if (e.noFish) pass("noFish", !/(salmon|sardine|mackerel|\bfish\b)/.test(meals), "no fish in meals");
  if (e.noNuts) pass("noNuts", !/(macadamia|almond|\bnuts\b)/.test(meals), "no nuts in meals");
  if (e.noPork) pass("noPork", !/(pork|bacon)/.test(meals), "no pork in meals");
  if (e.greenOnly || e.noYellowFerments) {
    pass(
      "noYellowFerments",
      !/(sauerkraut|kimchi|pickle)/.test(meals),
      "no fermented sides in flare week"
    );
  }
  if (e.hasFerments) {
    pass("hasFerments", /(sauerkraut|kimchi|pickle)/.test(text), "ferments present");
  }
  if (e.hasCookedVeg) {
    pass(
      "hasCookedVeg",
      /(zucchini|green beans|spinach|asparagus|squash|courgette)/.test(meals),
      "cooked above-ground veg present"
    );
  }
  if (e.allowsRiceOrBanana) {
    pass(
      "allowsRiceOrBanana",
      /\brice\b/.test(meals) || meals.includes("banana") || meals.includes("honey"),
      "gain carbs present"
    );
  }
  if (e.fillerIgnored) {
    pass(
      "fillerIgnored",
      !/(enjoy n\/a|leave out not really|leave out n\/a|lean into n\/a)/.test(text),
      "filler not treated as food"
    );
  }
  if (e.mentionsMedOrConsult) {
    const hit =
      /(pregnan|breastfeed|prednisone|humira|kidney|under 18|surgery|resection|bleeding|diabet|consult|doctor|sameer|medication|important:)/.test(
        text
      );
    pass("mentionsMedOrConsult", hit, hit ? "safety signal present" : "MISSING safety nudge");
  }
  const ratio = titles.length ? unique.size / titles.length : 0;
  const tightPool =
    persona.flareState === "active-flare" ||
    (persona.restrictions || []).includes("dairy-free") ||
    (persona.restrictions || []).includes("egg-free") ||
    persona.dietType === "vegetarian";
  const minUnique = tightPool ? 5 : 10;
  const minRatio = tightPool ? 0.3 : 0.55;
  pass(
    "variety",
    unique.size >= Math.min(titles.length, minUnique) && ratio >= minRatio,
    `${unique.size}/${titles.length} unique (${(ratio * 100).toFixed(0)}%)`
  );

  const failed = checks.filter((c) => !c.ok);
  return {
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
    checks,
    failed,
    accurate: failed.length === 0,
  };
}

function toMarkdown(persona: Persona, plan: MealPlan, score: ReturnType<typeof scorePersona>, insights: string) {
  const lines: string[] = [];
  lines.push(`# ${persona.name} — ${persona.id}`);
  lines.push("");
  lines.push(`- **Email:** ${persona.email}`);
  lines.push(`- **Accuracy:** ${score.accurate ? "PASS" : "ISSUES"} (${score.passCount} ok / ${score.failCount} fail)`);
  lines.push("");
  lines.push("## Persona brief");
  lines.push(
    `- ${persona.dietType}, meat ${persona.meatFrequency}, flare ${persona.flareState}, goal ${persona.goal}`
  );
  lines.push(`- Restrictions: ${persona.restrictions.join(", ") || "none"}`);
  lines.push(`- Loves: ${persona.loves} | Avoids: ${persona.dislikes}`);
  lines.push(`- Notes: ${persona.notes}`);
  lines.push("");
  lines.push("## Form intelligence");
  lines.push(insights || "_(quiet)_");
  lines.push("");
  lines.push("## Checks");
  for (const c of score.checks) {
    lines.push(`- ${c.ok ? "✅" : "❌"} **${c.id}**: ${c.detail}`);
  }
  lines.push("");
  lines.push(`## Plan: ${plan.headline}`);
  lines.push("");
  lines.push(plan.intro);
  lines.push("");
  for (const day of plan.days) {
    lines.push(`### ${day.label}`);
    for (const m of day.meals) {
      lines.push(`- **${m.slot} — ${m.title}:** ${m.items.join("; ")}`);
      if (m.note) lines.push(`  - _${m.note}_`);
    }
    lines.push("");
  }
  lines.push("### Green foundation");
  for (const g of plan.greenFoundation) lines.push(`- ${g}`);
  lines.push("");
  lines.push("### Personal notes");
  for (const n of plan.personalNotes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

async function maybeSend(to: string, firstName: string, plan: MealPlan) {
  if (!SEND_EMAIL) return { attempted: false, ok: false, id: null as string | null };
  const { sendPlanEmail } = await import("../src/lib/email.ts");
  const res = await sendPlanEmail({ to, firstName, plan });
  return { attempted: true, ok: res.ok, id: res.id ?? null };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const results: unknown[] = [];

  for (const persona of PERSONAS) {
    const intake: Intake = {
      name: persona.name,
      email: persona.email,
      age: persona.age,
      sex: persona.sex,
      unit: persona.unit || "metric",
      weight: persona.weight,
      height: persona.height,
      dietType: persona.dietType,
      meatFrequency: persona.meatFrequency,
      restrictions: persona.restrictions,
      dislikes: persona.dislikes,
      loves: persona.loves,
      flareState: persona.flareState,
      goal: persona.goal,
      cookingConfidence: persona.cookingConfidence,
      notes: persona.notes,
    };

    const insights = analyzeFormInput(intake);
    const brief = {
      avoidFoods: insights.avoidFoods,
      emphasizeFoods: insights.emphasizeFoods,
      inferredRestrictions: insights.inferredRestrictions,
      safetyFlags: insights.safetyFlags,
      summary: insights.planStrategy,
      digestedBy: "heuristic" as const,
    };
    const plan = generateMealPlan(intake, brief);
    // Merge safety into personal notes for scoring when heuristic only flags live UI
    const score = scorePersona(
      persona,
      {
        ...plan,
        personalNotes: [...plan.personalNotes, ...insights.safetyFlags],
      },
      insights.liveAcknowledgments.join(" | ")
    );

    const md = toMarkdown(
      persona,
      plan,
      score,
      insights.liveAcknowledgments.join("\n") || "_(quiet)_"
    );
    const html = renderPlanEmail(plan, persona.name.split(" ")[0] || "there");
    await fs.writeFile(path.join(OUT_DIR, `${persona.id}.md`), md);
    await fs.writeFile(path.join(OUT_DIR, `${persona.id}.email.html`), html);
    await fs.writeFile(
      path.join(OUT_DIR, `${persona.id}.json`),
      JSON.stringify({ persona, plan, insights, score }, null, 2)
    );

    const email = await maybeSend(persona.email, persona.name.split(" ")[0], plan);
    console.log(
      `${score.accurate ? "PASS" : "ISSUE"} ${persona.id} ferments=${/(sauerkraut|kimchi|pickle)/i.test(mealBlob(plan))} email=${email.attempted ? (email.ok ? "sent" : "fail") : "skipped"}`
    );
    results.push({
      id: persona.id,
      email: persona.email,
      name: persona.name,
      accurate: score.accurate,
      failCount: score.failCount,
      failed: score.failed,
      email,
    });
    if (SEND_EMAIL) await new Promise((r) => setTimeout(r, 1200));
  }

  const accurate = (results as { accurate: boolean }[]).filter((r) => r.accurate).length;
  const review = [
    "# Persona battery accuracy review",
    "",
    `Ran: ${new Date().toISOString()}`,
    `Mode: offline generate${SEND_EMAIL ? " + SMTP" : " (no email)"}`,
    `Skipped: ruthlesslegend (not an email)`,
    "",
    "## Totals",
    "",
    `- Personas: **${PERSONAS.length}**`,
    `- Accurate: **${accurate}**`,
    `- With issues: **${PERSONAS.length - accurate}**`,
    "",
    "## Verdict",
    "",
    accurate === PERSONAS.length
      ? "**Overall: ACCURATE** for this battery against current meal-plan rules."
      : `**Overall: PARTIALLY ACCURATE** — ${accurate}/${PERSONAS.length} fully matched. See per-persona failures.`,
    "",
    "## Per-persona",
    "",
    ...(results as { id: string; name: string; accurate: boolean; failed?: { id: string }[] }[]).map(
      (r) =>
        r.accurate
          ? `- ✅ **${r.id}** (${r.name})`
          : `- ⚠️ **${r.id}** (${r.name}) — ${(r.failed || []).map((f) => f.id).join(", ")}`
    ),
    "",
    "Reports: `test-reports/*.md` · Email HTML: `test-reports/*.email.html`",
    "",
  ].join("\n");

  await fs.writeFile(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify({ results }, null, 2));
  await fs.writeFile(path.join(OUT_DIR, "ACCURACY_REVIEW.md"), review);
  console.log("\n" + review);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
