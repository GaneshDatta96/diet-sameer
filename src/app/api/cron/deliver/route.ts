import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { deliverDueOrders, sendDueFeedbackEmails } from "@/lib/deliver";

/**
 * Daily cron:
 * - Plan delivery fallback (orders not scheduled via Resend)
 * - 48h post-purchase feedback emails (SMTP path)
 *
 * Vercel Cron sends Authorization: Bearer $CRON_SECRET when set.
 */
async function handle(req: Request) {
  if (config.cronSecret) {
    const url = new URL(req.url);
    const provided =
      url.searchParams.get("secret") ??
      req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== config.cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const delivered = await deliverDueOrders();
  const feedback = await sendDueFeedbackEmails();
  return NextResponse.json({ ok: true, delivered, feedback });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
