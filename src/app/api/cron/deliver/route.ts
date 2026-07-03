import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { deliverDueOrders } from "@/lib/deliver";

/**
 * Delivery cron. Point a scheduler (Vercel Cron, GitHub Actions, cron-job.org)
 * at this every ~15 minutes. Protect it by setting CRON_SECRET and passing it
 * as ?secret= or an Authorization: Bearer header.
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
  const sent = await deliverDueOrders();
  return NextResponse.json({ ok: true, delivered: sent });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
