import { NextResponse } from "next/server";
import {
  parseKajabiPaymentWebhook,
  verifyKajabiWebhookSecret,
} from "@/lib/kajabi";
import { config } from "@/lib/config";
import { recordPaidEntitlement } from "@/lib/entitlements";
import { fulfillOrder, fulfillResponseBody } from "@/lib/fulfillOrder";
import { findPendingOrderByEmail, getOrder } from "@/lib/store";

/**
 * Kajabi Payment Succeeded webhook.
 * Pay-first flow: always records a paid entitlement by email.
 * If a pending Vercel order already exists, fulfills it immediately.
 * Otherwise the customer completes the questionnaire iframe next.
 *
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

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const paymentRef = transactionId
    ? `kajabi:${transactionId}`
    : `kajabi:${Date.now()}`;

  await recordPaidEntitlement({
    email,
    paymentRef,
    offerId: offerId ?? undefined,
  });

  let order = orderId ? await getOrder(orderId) : undefined;
  if (!order) {
    order = await findPendingOrderByEmail(email);
  }

  if (!order) {
    // Pay-first: questionnaire comes after checkout.
    return NextResponse.json({
      ok: true,
      awaitingIntake: true,
      email: email.trim().toLowerCase(),
    });
  }

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
