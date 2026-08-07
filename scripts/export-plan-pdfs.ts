/**
 * Generate improved plans as PDFs for every persona.
 *
 *   node --require ./scripts/load-env.cjs --import tsx scripts/export-plan-pdfs.ts
 *
 * PDFs land in: test-reports/pdfs/
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { generateMealPlan } from "../src/lib/mealPlan.ts";
import { analyzeFormInput } from "../src/lib/formIntelligence.ts";
import { writePlanPdf } from "../src/lib/planPdf.ts";
import type { Intake } from "../src/lib/types.ts";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PDF_DIR = path.join(ROOT, "test-reports", "pdfs");
const OUT_DIR = path.join(ROOT, "test-reports");

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
};

const PERSONAS: Persona[] = require("./persona-data.json");

async function main() {
  await fs.mkdir(PDF_DIR, { recursive: true });
  const index: { id: string; name: string; email: string; pdf: string }[] = [];

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
      restrictions: persona.restrictions || [],
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
    const filename = `${persona.id}.pdf`;
    const outPath = path.join(PDF_DIR, filename);
    await writePlanPdf(plan, {
      outPath,
      email: persona.email,
      personaLabel: `${persona.name} · ${persona.dietType} · ${persona.flareState} · ${persona.goal}`,
    });

    // Also refresh markdown for side-by-side review
    const mdPath = path.join(OUT_DIR, `${persona.id}.md`);
    const lines = [
      `# ${persona.name} — ${persona.id}`,
      "",
      `- Email: ${persona.email}`,
      `- PDF: pdfs/${filename}`,
      `- ${persona.dietType}, ${persona.flareState}, ${persona.goal}`,
      "",
      plan.intro,
      "",
      ...plan.days.flatMap((d) => [
        `### ${d.label}`,
        ...d.meals.map(
          (m) =>
            `- **${m.slot} — ${m.title}:** ${m.items.join("; ")}` +
            (m.note ? `\n  - _${m.note}_` : "")
        ),
        "",
      ]),
      "### Personal notes",
      ...plan.personalNotes.map((n) => `- ${n}`),
      "",
    ];
    await fs.writeFile(mdPath, lines.join("\n"));

    index.push({
      id: persona.id,
      name: persona.name,
      email: persona.email,
      pdf: `pdfs/${filename}`,
    });
    console.log(`PDF → ${filename}`);
  }

  const indexMd = [
    "# Gut Freedom — persona plan PDFs",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Folder: \`d:\\SD\\test-reports\\pdfs\\\``,
    "",
    "| Persona | Email | PDF |",
    "|---------|-------|-----|",
    ...index.map(
      (r) => `| ${r.name} (\`${r.id}\`) | ${r.email} | [${r.pdf}](${r.pdf}) |`
    ),
    "",
    "Open any `.pdf` in that folder to review the full 7-day plan.",
    "",
  ].join("\n");

  await fs.writeFile(path.join(PDF_DIR, "INDEX.md"), indexMd);
  await fs.writeFile(
    path.join(PDF_DIR, "index.json"),
    JSON.stringify(index, null, 2)
  );
  console.log(`\nDone. ${index.length} PDFs in ${PDF_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
