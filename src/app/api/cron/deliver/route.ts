import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { deliverDueOrders } from "@/lib/deliver";

/**
 * Manual delivery fallback for orders that were not scheduled via Resend.
 * Not required in normal operation — Resend scheduled_at handles delivery.
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
