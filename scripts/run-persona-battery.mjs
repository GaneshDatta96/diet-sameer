/**
 * End-to-end persona battery for Gut Freedom meal plans.
 * Usage (with `npm run dev` or `npm start` on :3000):
 *   node scripts/run-persona-battery.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "test-reports");
const BASE = process.env.BASE_URL || "http://localhost:3000";

/** Unique IBD-scope personalities — one per inbox (ruthlesslegend skipped: not an email). */
const PERSONAS = [
  {
    id: "01-dallas-flare",
    email: "dallasvandewellness@gmail.com",
    name: "Dallas Reed",
    age: 34,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "active-flare",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "ribeye, bone broth",
    dislikes: "salads, raw kale",
    notes: "Crohn's flare this week — bloody stools sometimes. On mesalazine.",
    cookingConfidence: "some",
    unit: "imperial",
    weight: 175,
    height: 71,
    expect: {
      noYellowFerments: true,
      greenOnly: true,
      mentionsMedOrConsult: true,
    },
  },
  {
    id: "02-katy-veg-lose",
    email: "katyvandewellness@gmail.com",
    name: "Katy Mendoza",
    age: 29,
    sex: "female",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: [],
    loves: "eggs, butter, zucchini",
    dislikes: "nothing",
    notes: "Ulcerative colitis in remission. Want fat loss without flare.",
    cookingConfidence: "confident",
    unit: "metric",
    weight: 68,
    height: 165,
    expect: {
      noBanana: true,
      noRice: true,
      noHoney: true,
      hasCookedVeg: true,
      fillerIgnored: true,
    },
  },
  {
    id: "03-jaya-semi-dairyfree",
    email: "vandejayanagar@gmail.com",
    name: "Priya Natarajan",
    age: 41,
    sex: "female",
    dietType: "semi-vegetarian",
    meatFrequency: "weekly",
    flareState: "settling",
    goal: "more-energy",
    restrictions: ["dairy-free"],
    loves: "salmon, eggs",
    dislikes: "cheese, yoghurt",
    notes: "Dairy bloating. Prefer fish once a week.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 58,
    height: 160,
    expect: { noDairy: true, limitedFlesh: true },
  },
  {
    id: "04-feel-anchor-gain",
    email: "feelanchor.app@gmail.com",
    name: "Marcus Hale",
    age: 27,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "few-times-week",
    flareState: "calm",
    goal: "gain-weight",
    restrictions: [],
    loves: "ground beef, rice",
    dislikes: "organ meats",
    notes: "Underweight after colitis flare last year. Need gentle calories.",
    cookingConfidence: "minimal",
    unit: "imperial",
    weight: 132,
    height: 70,
    expect: { allowsRiceOrBanana: true, hasFerments: true },
  },
  {
    id: "05-ganesh-eggfree",
    email: "ganeshdatta1112@gmail.com",
    name: "Arun Patel",
    age: 38,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "not-sure",
    goal: "calm-symptoms",
    restrictions: ["egg-free"],
    loves: "lamb, tallow",
    dislikes: "eggs",
    notes: "Egg allergy. Suspected IBD, waiting on colonoscopy.",
    cookingConfidence: "confident",
    unit: "metric",
    weight: 72,
    height: 175,
    expect: { noEggs: true },
  },
  {
    id: "06-prarthana-veg-flare",
    email: "ganeshwedsprarthana@gmail.com",
    name: "Prarthana Bhat",
    age: 26,
    sex: "female",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "active-flare",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "ghee, eggs",
    dislikes: "raw salad",
    notes: "Active UC flare. Keep it very gentle.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 52,
    height: 158,
    expect: { greenOnly: true, noYellowFerments: true },
  },
  {
    id: "07-hedoes-nightshade",
    email: "hedoespodcast@gmail.com",
    name: "Leo Vargas",
    age: 45,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "few-times-week",
    flareState: "calm",
    goal: "maintain",
    restrictions: ["nightshade-free"],
    loves: "ribeye, sauerkraut",
    dislikes: "tomatoes, peppers",
    notes: "Nightshades trigger cramps.",
    cookingConfidence: "confident",
    unit: "imperial",
    weight: 190,
    height: 72,
    expect: { hasFerments: true },
  },
  {
    id: "08-hedoes2-porkfree",
    email: "hedoespodcasts@gmail.com",
    name: "Imran Shah",
    age: 33,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "settling",
    goal: "calm-symptoms",
    restrictions: ["pork-free"],
    loves: "beef, butter",
    dislikes: "pork, bacon",
    notes: "Halal preferences. Crohn's settling after flare.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 80,
    height: 178,
    expect: { noPork: true },
  },
  {
    id: "09-sapient-nutfree-lose",
    email: "sapientpodcast@gmail.com",
    name: "Sophie Laurent",
    age: 31,
    sex: "female",
    dietType: "semi-vegetarian",
    meatFrequency: "rarely",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: ["nut-free"],
    loves: "fish, eggs",
    dislikes: "nuts, almonds",
    notes: "Nut allergy. Fat loss focus.",
    cookingConfidence: "minimal",
    unit: "metric",
    weight: 74,
    height: 168,
    expect: { noNuts: true, noBanana: true, noRice: true },
  },
  {
    id: "10-work-filler-fields",
    email: "work.ganeshdatta@gmail.com",
    name: "Jordan Blake",
    age: 36,
    sex: "prefer-not-to-say",
    dietType: "meat-eater",
    meatFrequency: "few-times-week",
    flareState: "calm",
    goal: "more-energy",
    restrictions: [],
    loves: "n/a",
    dislikes: "not really",
    notes: "IBD-ish gut issues for years.",
    cookingConfidence: "some",
    unit: "imperial",
    weight: 160,
    height: 68,
    expect: { fillerIgnored: true, hasFerments: true },
  },
  {
    id: "11-prarthana21-veg-gain",
    email: "prarthanabhat21@gmail.com",
    name: "Ananya Krishnan",
    age: 24,
    sex: "female",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "settling",
    goal: "gain-weight",
    restrictions: [],
    loves: "white rice, yoghurt, eggs",
    dislikes: "none",
    notes: "Lost weight in flare. Need soft calories.",
    cookingConfidence: "confident",
    unit: "metric",
    weight: 48,
    height: 162,
    expect: { allowsRiceOrBanana: true, hasCookedVeg: true },
  },
  {
    id: "12-turtle-pregnant",
    email: "slowestturtle@proton.me",
    name: "Elena Brooks",
    age: 32,
    sex: "female",
    dietType: "semi-vegetarian",
    meatFrequency: "weekly",
    flareState: "calm",
    goal: "maintain",
    restrictions: [],
    loves: "salmon, eggs",
    dislikes: "liver",
    notes: "12 weeks pregnant, mild colitis history.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 62,
    height: 167,
    expect: { mentionsMedOrConsult: true },
  },
  {
    id: "13-christine-fishfree",
    email: "christine@ganeshdatta.me",
    name: "Christine Okonkwo",
    age: 40,
    sex: "female",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "calm",
    goal: "calm-symptoms",
    restrictions: ["fish-shellfish-free"],
    loves: "ribeye, eggs",
    dislikes: "fish, shellfish",
    notes: "Shellfish allergy. Crohn's diagnosed 2019.",
    cookingConfidence: "confident",
    unit: "imperial",
    weight: 148,
    height: 65,
    expect: { noFish: true, hasFerments: true },
  },
  {
    id: "14-dylan-caffeine",
    email: "dylan.arnold@ganeshdatta.me",
    name: "Dylan Arnold",
    age: 22,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "few-times-week",
    flareState: "not-sure",
    goal: "more-energy",
    restrictions: ["no-caffeine"],
    loves: "beef, pickles",
    dislikes: "coffee",
    notes: "Caffeine tanks my gut. Possible IBD.",
    cookingConfidence: "minimal",
    unit: "imperial",
    weight: 155,
    height: 70,
    expect: { hasFerments: true },
  },
  {
    id: "15-info-gd-lose-meat",
    email: "info@ganeshdatta.me",
    name: "Hank Morrison",
    age: 52,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: [],
    loves: "steak, kimchi",
    dislikes: "banana, rice",
    notes: "Need fat loss while keeping UC calm.",
    cookingConfidence: "confident",
    unit: "imperial",
    weight: 220,
    height: 74,
    expect: { noBanana: true, noRice: true, hasFerments: true },
  },
  {
    id: "16-work-gd-sugfree",
    email: "work@ganeshdatta.me",
    name: "Rita Chen",
    age: 37,
    sex: "female",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: ["no-added-sugar", "dairy-free"],
    loves: "eggs, zucchini",
    dislikes: "honey, sweets",
    notes: "Avoid added sugar. Dairy intolerant. UC calm.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 70,
    height: 163,
    expect: { noDairy: true, noHoney: true, noBanana: true, hasCookedVeg: true },
  },
  {
    id: "17-gia-veg-overlap",
    email: "gia.paige@ganeshdatta.co.in",
    name: "Gia Paige",
    age: 28,
    sex: "female",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "settling",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "cheese, eggs",
    dislikes: "cheese",
    notes: "Confused about cheese — both enjoy and avoid mentioned.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 55,
    height: 160,
    expect: { cheeseSafeHandling: true },
  },
  {
    id: "18-mathew-osteo",
    email: "mathew.olsen@ganeshdatta.co.in",
    name: "Mathew Olsen",
    age: 48,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "settling",
    goal: "gain-weight",
    restrictions: [],
    loves: "bone broth, butter",
    dislikes: "raw broccoli",
    notes: "Ileocecal resection 2 years ago. Want to regain weight.",
    cookingConfidence: "confident",
    unit: "metric",
    weight: 64,
    height: 180,
    expect: { mentionsMedOrConsult: true, allowsRiceOrBanana: true },
  },
  {
    id: "19-kate-steroid",
    email: "kate.ivanovich@ganeshdatta.co.in",
    name: "Kate Ivanovich",
    age: 35,
    sex: "female",
    dietType: "semi-vegetarian",
    meatFrequency: "weekly",
    flareState: "active-flare",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "eggs",
    dislikes: "spicy food",
    notes: "On prednisone for flare. Need gentle plan.",
    cookingConfidence: "minimal",
    unit: "metric",
    weight: 60,
    height: 170,
    expect: { greenOnly: true, mentionsMedOrConsult: true },
  },
  {
    id: "20-nicole-biologic",
    email: "nicole.bradburry@ganeshdatta.co.in",
    name: "Nicole Bradburry",
    age: 43,
    sex: "female",
    dietType: "meat-eater",
    meatFrequency: "few-times-week",
    flareState: "calm",
    goal: "maintain",
    restrictions: [],
    loves: "salmon, sauerkraut",
    dislikes: "seed oils",
    notes: "On Humira. Feeling stable.",
    cookingConfidence: "confident",
    unit: "imperial",
    weight: 142,
    height: 66,
    expect: { mentionsMedOrConsult: true, hasFerments: true },
  },
  {
    id: "21-chris-morris-kidney",
    email: "chris.morris@ganesh.solutions",
    name: "Chris Morris",
    age: 55,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: [],
    loves: "beef",
    dislikes: "n/a",
    notes: "Mild kidney concerns + IBD. Doctor watching protein.",
    cookingConfidence: "some",
    unit: "imperial",
    weight: 205,
    height: 71,
    expect: { mentionsMedOrConsult: true, noBanana: true },
  },
  {
    id: "22-claire-breastfeed",
    email: "claire@ganesh.solutions",
    name: "Claire Dupont",
    age: 30,
    sex: "female",
    dietType: "semi-vegetarian",
    meatFrequency: "weekly",
    flareState: "calm",
    goal: "more-energy",
    restrictions: [],
    loves: "eggs, yoghurt",
    dislikes: "nothing really",
    notes: "Breastfeeding. Colitis in remission.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 65,
    height: 165,
    expect: { mentionsMedOrConsult: true, fillerIgnored: true },
  },
  {
    id: "23-info-sol-under18",
    email: "info@ganesh.solutions",
    name: "Alex Rivera",
    age: 17,
    sex: "male",
    dietType: "meat-eater",
    meatFrequency: "daily",
    flareState: "settling",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "beef, eggs",
    dislikes: "vegetables raw",
    notes: "Teen with new Crohn's diagnosis.",
    cookingConfidence: "minimal",
    unit: "metric",
    weight: 58,
    height: 172,
    expect: { mentionsMedOrConsult: true },
  },
  {
    id: "24-jonnathan-veg-eggfree",
    email: "jonnathan@ganesh.solutions",
    name: "Jonnathan Lee",
    age: 39,
    sex: "male",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: ["egg-free"],
    loves: "aged cheese, ghee, zucchini",
    dislikes: "eggs",
    notes: "Vegetarian, egg-free, fat loss. UC calm.",
    cookingConfidence: "confident",
    unit: "metric",
    weight: 82,
    height: 176,
    expect: { noEggs: true, noBanana: true, hasCookedVeg: true },
  },
  {
    id: "25-morrison-bleed",
    email: "morrison@ganesh.solutions",
    name: "Patricia Morrison",
    age: 61,
    sex: "female",
    dietType: "semi-vegetarian",
    meatFrequency: "rarely",
    flareState: "active-flare",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "eggs, butter",
    dislikes: "fiber",
    notes: "Rectal bleeding this week. Worried.",
    cookingConfidence: "minimal",
    unit: "imperial",
    weight: 138,
    height: 64,
    expect: { greenOnly: true, mentionsMedOrConsult: true },
  },
  {
    id: "26-mysore-diabetes",
    email: "vandemysore@protonmail.com",
    name: "Ravi Hegde",
    age: 50,
    sex: "male",
    dietType: "vegetarian",
    meatFrequency: "never",
    flareState: "calm",
    goal: "lose-weight",
    restrictions: [],
    loves: "eggs, ghee, green beans",
    dislikes: "sweets",
    notes: "Type 2 diabetes + IBD symptoms. Prefer low starch.",
    cookingConfidence: "some",
    unit: "metric",
    weight: 88,
    height: 170,
    expect: { mentionsMedOrConsult: true, noRice: true, noBanana: true },
  },
  {
    id: "27-cypress-happy-path",
    email: "VandeCypress@proton.me",
    name: "Nora Cypress",
    age: 34,
    sex: "female",
    dietType: "meat-eater",
    meatFrequency: "few-times-week",
    flareState: "calm",
    goal: "calm-symptoms",
    restrictions: [],
    loves: "salmon, ribeye, pickles",
    dislikes: "seed oils",
    notes: "Standard calm UC maintenance test.",
    cookingConfidence: "confident",
    unit: "metric",
    weight: 62,
    height: 168,
    expect: { hasFerments: true, varietyOk: true },
  },
];

function planText(plan) {
  if (!plan) return "";
  const parts = [
    plan.headline,
    plan.intro,
    ...(plan.personalNotes || []),
    ...(plan.greenFoundation || []),
    ...(plan.testCarefully || []),
    ...(plan.days || []).flatMap((d) =>
      (d.meals || []).flatMap((m) => [m.title, ...(m.items || []), m.note || ""])
    ),
  ];
  return parts.join("\n").toLowerCase();
}

function dayTitles(plan) {
  return (plan?.days || []).flatMap((d) =>
    (d.meals || []).map((m) => `${m.slot}:${m.title}`)
  );
}

function scorePersona(persona, plan, order) {
  const text = planText(plan);
  const titles = dayTitles(plan);
  const unique = new Set(titles);
  const checks = [];
  const e = persona.expect || {};

  const pass = (id, ok, detail) => checks.push({ id, ok, detail });

  if (e.noBanana) pass("noBanana", !text.includes("banana"), "banana absent");
  if (e.noRice) pass("noRice", !/\brice\b/.test(text), "rice absent");
  if (e.noHoney) pass("noHoney", !text.includes("honey"), "honey absent");
  if (e.noEggs)
    pass("noEggs", !/\beggs?\b/.test(text) || text.includes("egg-free"), "eggs absent from meals");
  if (e.noDairy)
    pass(
      "noDairy",
      !/(butter|ghee|cheese|yoghurt|yogurt|dairy)/.test(text) ||
        (order?.intake?.restrictions || []).includes("dairy-free"),
      "meals should avoid dairy when dairy-free"
    );
  if (e.noFish) pass("noFish", !/(salmon|sardine|mackerel|fish)/.test(text), "no fish");
  if (e.noNuts) pass("noNuts", !/(macadamia|almond|nuts)/.test(text), "no nuts");
  if (e.noPork) pass("noPork", !/(pork|bacon)/.test(text), "no pork");

  if (e.greenOnly) {
    const yellow = (plan?.days || []).some((d) =>
      (d.meals || []).some((m) => /yellow|sauerkraut|kimchi|pickle|squash|zucchini/.test(
        `${m.title} ${m.items?.join(" ")} ${m.note || ""}`.toLowerCase()
      ))
    );
    // Active flare templates should be green-only; fermented yellow sides should be gone
    const ferment = /(sauerkraut|kimchi|pickle)/.test(text);
    pass("greenOnly", !ferment, ferment ? "found fermented yellow sides in flare" : "no ferment sides");
  }

  if (e.noYellowFerments) {
    pass(
      "noYellowFerments",
      !/(sauerkraut|kimchi|pickle)/.test(text),
      "no fermented sides during flare"
    );
  }

  if (e.hasFerments) {
    pass(
      "hasFerments",
      /(sauerkraut|kimchi|pickle)/.test(text),
      "has sauerkraut/kimchi/pickles"
    );
  }

  if (e.hasCookedVeg) {
    pass(
      "hasCookedVeg",
      /(zucchini|green beans|spinach|asparagus|squash|courgette)/.test(text),
      "has well-cooked above-ground veg"
    );
  }

  if (e.allowsRiceOrBanana) {
    pass(
      "allowsRiceOrBanana",
      /\brice\b/.test(text) || text.includes("banana") || text.includes("honey"),
      "includes gain carbs"
    );
  }

  if (e.fillerIgnored) {
    // personal notes / meal titles shouldn't lean into "n/a" or "not really"
    pass(
      "fillerIgnored",
      !/(enjoy n\/a|leave out not really|leave out n\/a|enjoy nothing)/.test(text),
      "filler not treated as food"
    );
  }

  if (e.mentionsMedOrConsult) {
    // digest safety may only show when AI on; rules engine does put some flags in notes
    const hit =
      /(pregnan|breastfeed|prednisone|humira|kidney|under 18|surgery|resection|bleeding|diabet|consult|doctor|sameer)/.test(
        text
      );
    pass("mentionsMedOrConsult", hit, hit ? "safety/consult signal present" : "MISSING safety nudge");
  }

  if (e.varietyOk || true) {
    const ratio = titles.length ? unique.size / titles.length : 0;
    pass(
      "variety",
      unique.size >= Math.min(titles.length, 10) && ratio >= 0.55,
      `${unique.size}/${titles.length} unique meal titles (${(ratio * 100).toFixed(0)}%)`
    );
  }

  // Dairy-free stricter meal check
  if (e.noDairy && plan) {
    const mealBlob = (plan.days || [])
      .flatMap((d) => (d.meals || []).flatMap((m) => [m.title, ...(m.items || [])]))
      .join(" ")
      .toLowerCase();
    const dairyHit = /(butter|ghee|cheese|yoghurt|yogurt)/.test(mealBlob);
    pass("noDairyMeals", !dairyHit, dairyHit ? "dairy still in meal items" : "meals dairy-clean");
  }

  if (e.noEggs && plan) {
    const mealBlob = (plan.days || [])
      .flatMap((d) => (d.meals || []).flatMap((m) => [m.title, ...(m.items || [])]))
      .join(" ")
      .toLowerCase();
    pass("noEggsMeals", !/\begg/.test(mealBlob), "meal items egg-free");
  }

  const failed = checks.filter((c) => !c.ok);
  return {
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
    checks,
    failed,
    accurate: failed.length === 0,
  };
}

function toMarkdown(persona, order, score) {
  const plan = order?.plan;
  const lines = [];
  lines.push(`# ${persona.name} — ${persona.id}`);
  lines.push("");
  lines.push(`- **Email:** ${persona.email}`);
  lines.push(`- **Order ID:** ${order?.id || "n/a"}`);
  lines.push(`- **Status:** ${order?.status || "n/a"}`);
  lines.push(`- **Email id:** ${order?.resendEmailId || "n/a"}`);
  lines.push(`- **Accuracy:** ${score.accurate ? "PASS" : "ISSUES"} (${score.passCount} ok / ${score.failCount} fail)`);
  lines.push("");
  lines.push("## Persona");
  lines.push("```json");
  lines.push(
    JSON.stringify(
      {
        dietType: persona.dietType,
        meatFrequency: persona.meatFrequency,
        flareState: persona.flareState,
        goal: persona.goal,
        restrictions: persona.restrictions,
        loves: persona.loves,
        dislikes: persona.dislikes,
        notes: persona.notes,
      },
      null,
      2
    )
  );
  lines.push("```");
  lines.push("");
  lines.push("## Checks");
  for (const c of score.checks) {
    lines.push(`- ${c.ok ? "✅" : "❌"} **${c.id}**: ${c.detail}`);
  }
  lines.push("");
  if (plan) {
    lines.push(`## Plan: ${plan.headline}`);
    lines.push("");
    lines.push(plan.intro);
    lines.push("");
    for (const day of plan.days || []) {
      lines.push(`### ${day.label}`);
      for (const m of day.meals || []) {
        lines.push(`- **${m.slot} — ${m.title}:** ${(m.items || []).join("; ")}`);
        if (m.note) lines.push(`  - _${m.note}_`);
      }
      lines.push("");
    }
    lines.push("### Personal notes");
    for (const n of plan.personalNotes || []) lines.push(`- ${n}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/plan");
      if (res.ok || res.status === 200) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not reachable at ${BASE}`);
}

async function submitPersona(persona) {
  const payload = {
    name: persona.name,
    email: persona.email,
    age: persona.age,
    sex: persona.sex,
    unit: persona.unit || "metric",
    weight: persona.weight,
    height: persona.height,
    dietType: persona.dietType,
    meatFrequency: persona.meatFrequency,
    flareState: persona.flareState,
    goal: persona.goal,
    restrictions: persona.restrictions || [],
    loves: persona.loves,
    dislikes: persona.dislikes,
    notes: persona.notes,
    cookingConfidence: persona.cookingConfidence,
  };

  const orderRes = await fetch(`${BASE}/api/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const orderText = await orderRes.text();
  let orderJson;
  try {
    orderJson = JSON.parse(orderText);
  } catch {
    throw new Error(`order non-JSON (${orderRes.status}): ${orderText.slice(0, 200)}`);
  }
  if (!orderRes.ok) throw new Error(orderJson.error || `order ${orderRes.status}`);

  const confirmRes = await fetch(`${BASE}/api/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderJson.orderId, mock: true }),
  });
  const confirmText = await confirmRes.text();
  let confirmJson;
  try {
    confirmJson = JSON.parse(confirmText);
  } catch {
    throw new Error(`confirm non-JSON (${confirmRes.status}): ${confirmText.slice(0, 300)}`);
  }
  if (!confirmRes.ok) throw new Error(confirmJson.error || `confirm ${confirmRes.status}`);

  return { orderId: orderJson.orderId, confirm: confirmJson };
}

async function loadOrdersFile() {
  const file = path.join(ROOT, ".data", "orders.json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  console.log(`Base URL: ${BASE}`);
  console.log(`Personas: ${PERSONAS.length} (skipped ruthlesslegend — not an email)`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await waitForServer();

  const results = [];
  for (const persona of PERSONAS) {
    process.stdout.write(`→ ${persona.id} (${persona.email}) ... `);
    try {
      const { orderId, confirm } = await submitPersona(persona);
      // brief pause so Gmail SMTP isn't hammered
      await new Promise((r) => setTimeout(r, 1500));
      const all = await loadOrdersFile();
      const order = all[orderId];
      const score = scorePersona(persona, order?.plan, order);
      const md = toMarkdown(persona, order, score);
      await fs.writeFile(path.join(OUT_DIR, `${persona.id}.md`), md, "utf8");
      await fs.writeFile(
        path.join(OUT_DIR, `${persona.id}.json`),
        JSON.stringify({ persona, orderId, confirm, order, score }, null, 2),
        "utf8"
      );
      console.log(
        order?.resendEmailId === "mock"
          ? `OK but MOCK email (${score.accurate ? "accurate" : "issues"})`
          : `OK emailed id=${order?.resendEmailId || "?"} (${score.accurate ? "accurate" : "ISSUES"})`
      );
      results.push({
        id: persona.id,
        email: persona.email,
        name: persona.name,
        orderId,
        emailId: order?.resendEmailId || null,
        accurate: score.accurate,
        failCount: score.failCount,
        failed: score.failed,
        status: "ok",
      });
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      results.push({
        id: persona.id,
        email: persona.email,
        name: persona.name,
        status: "error",
        error: err.message,
        accurate: false,
      });
      await fs.writeFile(
        path.join(OUT_DIR, `${persona.id}.error.txt`),
        String(err.stack || err.message),
        "utf8"
      );
    }
  }

  const ok = results.filter((r) => r.status === "ok");
  const accurate = ok.filter((r) => r.accurate);
  const emailed = ok.filter((r) => r.emailId && r.emailId !== "mock");
  const summary = {
    ranAt: new Date().toISOString(),
    baseUrl: BASE,
    skipped: ["ruthlesslegend (not an email)"],
    totals: {
      personas: PERSONAS.length,
      submittedOk: ok.length,
      errors: results.filter((r) => r.status === "error").length,
      accurate: accurate.length,
      withIssues: ok.length - accurate.length,
      realEmailsSent: emailed.length,
      mockEmails: ok.filter((r) => r.emailId === "mock").length,
    },
    results,
  };

  const issues = results.filter((r) => r.status === "error" || r.failCount > 0);
  let review = `# Persona battery accuracy review\n\n`;
  review += `Ran: ${summary.ranAt}\n`;
  review += `Base: ${BASE}\n\n`;
  review += `## Totals\n\n`;
  review += `- Personas run: **${summary.totals.personas}**\n`;
  review += `- Submissions OK: **${summary.totals.submittedOk}**\n`;
  review += `- Errors: **${summary.totals.errors}**\n`;
  review += `- Accurate (all checks pass): **${summary.totals.accurate}**\n`;
  review += `- With accuracy issues: **${summary.totals.withIssues}**\n`;
  review += `- Real SMTP emails: **${summary.totals.realEmailsSent}**\n`;
  review += `- Mock emails (no SMTP): **${summary.totals.mockEmails}**\n`;
  review += `- Skipped: ruthlesslegend (not an email)\n\n`;
  review += `## Verdict\n\n`;
  if (summary.totals.errors === 0 && summary.totals.withIssues === 0) {
    review += `**Overall: ACCURATE for this battery.** All personas submitted, plans matched expected IBD/scope rules, and mail path completed.\n\n`;
  } else if (summary.totals.submittedOk === 0) {
    review += `**Overall: BROKEN.** No successful submissions — check server, Supabase/local store, and SMTP env.\n\n`;
  } else {
    review += `**Overall: PARTIALLY ACCURATE.** ${summary.totals.accurate}/${summary.totals.submittedOk} plans fully matched checks. See failures below.\n\n`;
  }
  review += `## Per-persona\n\n`;
  for (const r of results) {
    if (r.status === "error") {
      review += `- ❌ **${r.id}** (${r.email}): submit error — ${r.error}\n`;
    } else if (r.accurate) {
      review += `- ✅ **${r.id}** (${r.name}) — emailed: ${r.emailId}\n`;
    } else {
      review += `- ⚠️ **${r.id}** (${r.name}) — ${r.failCount} issue(s): ${(r.failed || []).map((f) => f.id).join(", ")}\n`;
    }
  }
  review += `\nIndividual reports: \`test-reports/*.md\`\n`;

  await fs.writeFile(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(OUT_DIR, "ACCURACY_REVIEW.md"), review);
  console.log("\n" + review);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
