import { NextResponse } from "next/server";
import { config, deliveryWindowHours, randomDeliveryDelayMs } from "@/lib/config";
import { getOrder, updateOrder } from "@/lib/store";
import { generatePlan } from "@/lib/ai";
import { scheduleDelivery } from "@/lib/deliver";

/**
 * Confirm payment, generate the plan, and schedule delayed delivery.
 * - Stripe mode: verifies the Checkout Session was actually paid.
 * - Mock mode: accepts directly (only when Stripe is not configured).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderId?: string;
    sessionId?: string;
    mock?: boolean;
  } | null;

  const orderId = body?.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Idempotent: if already processed, just return the schedule.
  if (order.status === "paid" || order.status === "delivered") {
    return NextResponse.json({
      ok: true,
      deliverAt: order.deliverAt,
      window: deliveryWindowHours(),
      alreadyDone: true,
    });
  }

  // Verify payment.
  let paymentRef: string | undefined;
  if (config.stripe.enabled) {
    if (!body?.sessionId) {
      return NextResponse.json({ error: "Missing payment session" }, { status: 400 });
    }
    const verified = await verifyStripeSession(body.sessionId, orderId);
    if (!verified.ok) {
      return NextResponse.json({ error: "Payment not verified" }, { status: 402 });
    }
    paymentRef = body.sessionId;
  } else {
    // Mock mode only valid when Stripe isn't configured.
    if (!body?.mock) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }
    paymentRef = "mock";
  }

  // Generate the plan now, but hold delivery for the "crafting" window.
  const plan = await generatePlan(order.intake);
  const deliverAt = Date.now() + randomDeliveryDelayMs();

  await updateOrder(orderId, {
    status: "paid",
    plan,
    deliverAt,
    paymentRef,
  });

  scheduleDelivery(orderId, deliverAt);

  return NextResponse.json({
    ok: true,
    deliverAt,
    window: deliveryWindowHours(),
  });
}

async function verifyStripeSession(
  sessionId: string,
  orderId: string
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { Authorization: `Bearer ${config.stripe.secretKey}` },
      }
    );
    if (!res.ok) return { ok: false };
    const session = await res.json();
    const paid = session.payment_status === "paid";
    const matches =
      session.client_reference_id === orderId ||
      session.metadata?.orderId === orderId;
    return { ok: paid && matches };
  } catch (err) {
    console.error("[confirm] stripe verify error:", err);
    return { ok: false };
  }
}
