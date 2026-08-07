import PDFDocument from "pdfkit";
import { promises as fs } from "fs";
import path from "path";
import { MealPlan } from "./types";

/** Write a meal plan PDF to disk. Returns the absolute path. */
export async function writePlanPdf(
  plan: MealPlan,
  opts: {
    outPath: string;
    email?: string;
    personaLabel?: string;
  }
): Promise<string> {
  await fs.mkdir(path.dirname(opts.outPath), { recursive: true });

  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
    info: {
      Title: plan.headline,
      Author: "Gut Freedom",
      Subject: "7-Day personalized meal plan",
    },
  });

  const stream = (await import("fs")).createWriteStream(opts.outPath);
  doc.pipe(stream);

  const teal = "#14564a";
  const muted = "#5c6b66";
  const ink = "#22302c";

  doc.fillColor(teal).fontSize(20).font("Helvetica-Bold").text(plan.headline, {
    width: 500,
  });
  doc.moveDown(0.3);
  if (opts.personaLabel) {
    doc.fillColor(muted).fontSize(10).font("Helvetica").text(opts.personaLabel);
  }
  if (opts.email) {
    doc.fillColor(muted).fontSize(10).text(opts.email);
  }
  doc.moveDown(0.6);
  doc
    .fillColor(ink)
    .fontSize(10)
    .font("Helvetica")
    .text(plan.intro, { width: 500, align: "left", lineGap: 2 });
  doc.moveDown(0.8);

  for (const day of plan.days) {
    doc.fillColor(teal).fontSize(13).font("Helvetica-Bold").text(day.label);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#2e9e7b")
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.35);
    if (day.why) {
      doc
        .fillColor(muted)
        .fontSize(9)
        .font("Helvetica-Oblique")
        .text(day.why, { width: 500 });
      doc.moveDown(0.25);
    }

    for (const meal of day.meals) {
      doc
        .fillColor("#2e9e7b")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(meal.slot.toUpperCase());
      doc
        .fillColor(ink)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(meal.title);
      doc
        .fillColor(muted)
        .fontSize(9)
        .font("Helvetica")
        .text(meal.items.join(" · "), { width: 500 });
      if (meal.note) {
        doc
          .fillColor(muted)
          .fontSize(8)
          .font("Helvetica-Oblique")
          .text(meal.note, { width: 500 });
      }
      doc.moveDown(0.35);
    }
    doc.moveDown(0.3);

    if (doc.y > 720) doc.addPage();
  }

  if (doc.y > 640) doc.addPage();

  doc.fillColor(teal).fontSize(12).font("Helvetica-Bold").text("Green foundation");
  doc.moveDown(0.2);
  for (const g of plan.greenFoundation) {
    doc.fillColor(ink).fontSize(9).font("Helvetica").text(`• ${g}`, { width: 500 });
  }
  doc.moveDown(0.5);

  if (plan.shoppingList?.length) {
    doc.fillColor(teal).fontSize(12).font("Helvetica-Bold").text("Shopping list");
    doc.moveDown(0.2);
    for (const g of plan.shoppingList) {
      doc.fillColor(ink).fontSize(9).font("Helvetica").text(`• ${g}`, { width: 500 });
    }
    doc.moveDown(0.5);
  }
  if (plan.prepTips?.length) {
    doc.fillColor(teal).fontSize(12).font("Helvetica-Bold").text("Prep tips");
    doc.moveDown(0.2);
    for (const g of plan.prepTips) {
      doc.fillColor(ink).fontSize(9).font("Helvetica").text(`• ${g}`, { width: 500 });
    }
    doc.moveDown(0.5);
  }
  if (plan.swaps?.length) {
    doc.fillColor(teal).fontSize(12).font("Helvetica-Bold").text("Easy swaps");
    doc.moveDown(0.2);
    for (const g of plan.swaps) {
      doc.fillColor(ink).fontSize(9).font("Helvetica").text(`• ${g}`, { width: 500 });
    }
    doc.moveDown(0.5);
  }

  doc.fillColor(teal).fontSize(12).font("Helvetica-Bold").text("Personal notes");
  doc.moveDown(0.2);
  for (const n of plan.personalNotes) {
    doc.fillColor(ink).fontSize(9).font("Helvetica").text(`• ${n}`, {
      width: 500,
      lineGap: 1,
    });
    doc.moveDown(0.15);
  }
  doc.moveDown(0.4);

  doc
    .fillColor(muted)
    .fontSize(8)
    .font("Helvetica-Oblique")
    .text(plan.disclaimer, { width: 500 });
  doc.moveDown(0.4);
  doc
    .fillColor(muted)
    .fontSize(8)
    .font("Helvetica")
    .text("www.sameerdossani.net · Educational plan — not medical advice.");

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return opts.outPath;
}
