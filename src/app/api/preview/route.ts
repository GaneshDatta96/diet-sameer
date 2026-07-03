import { NextResponse } from "next/server";
import { parseIntake } from "@/lib/validate";
import { generatePlan } from "@/lib/ai";

/**
 * Generate a plan WITHOUT payment — for Sameer/Ganesh to review output quality.
 * Disabled in production so it can't be used to bypass the paywall.
 * Set ALLOW_PREVIEW=1 to force-enable.
 */
export async function POST(req: Request) {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_PREVIEW === "1";
  if (!enabled) {
    return NextResponse.json({ error: "Preview disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { intake, error } = parseIntake(body);
  if (!intake) {
    return NextResponse.json({ error: error ?? "Invalid input" }, { status: 400 });
  }

  const plan = await generatePlan(intake);
  return NextResponse.json({ plan });
}
