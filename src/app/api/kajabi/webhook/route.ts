import { NextResponse } from "next/server";
import {
  parseKajabiPaymentWebhook,
  verifyKajabiWebhookSecret,
} from "@/lib/kajabi";
import { config } from "@/lib/config";
import { fulfillOrder, fulfillResponseBody } from "@/lib/fulfillOrder";
import { findPendingOrderByEmail, getOrder } from "@/lib/store";

/**
 * Kajabi Payment Succeeded webhook.
 * Configure in Kajabi: Settings → Integrations → Webhooks → Payment Succeeded
 * URL: https://your-app.vercel.app/api/kajabi/webhook?secret=YOUR_SECRET
 */
export async function POST(req: Request) {
  if (!verifyKajabiWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, orderId, offerId, transactionId } =
    parseKajabiPaymentWebhook(body);

  if (
    config.kajabi.offerId &&
    offerId &&
    offerId !== config.kajabi.offerId
  ) {
    return NextResponse.json({ ok: true, skipped: "offer mismatch" });
  }

  let order = orderId ? await getOrder(orderId) : undefined;
  if (!order && email) {
    order = await findPendingOrderByEmail(email);
  }

  if (!order) {
    console.error("[kajabi/webhook] no matching order", { email, orderId });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const paymentRef = transactionId
    ? `kajabi:${transactionId}`
    : `kajabi:${Date.now()}`;

  const result = await fulfillOrder(order.id, paymentRef);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Fulfillment failed" },
      { status: 502 }
    );
  }

  return NextResponse.json(fulfillResponseBody(result));
}

export async function GET(req: Request) {
  if (!verifyKajabiWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, service: "kajabi-webhook" });
}
