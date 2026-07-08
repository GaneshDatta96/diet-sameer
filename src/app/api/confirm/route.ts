import { NextResponse } from "next/server";
import { config, deliveryWindowHours, randomDeliveryDelayMs } from "@/lib/config";
import { sendPlanEmail } from "@/lib/email";
import { getOrder, updateOrder } from "@/lib/store";
import { generatePlan } from "@/lib/ai";

/**
 * Confirm payment, generate the plan, and schedule delivery via Resend.
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

  if (order.status === "paid" || order.status === "delivered") {
    return NextResponse.json({
      ok: true,
      deliverAt: order.deliverAt,
      window: deliveryWindowHours(),
      alreadyDone: true,
    });
  }

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
    if (!body?.mock) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }
    paymentRef = "mock";
  }

  const plan = await generatePlan(order.intake);
  const deliverAt = Date.now() + randomDeliveryDelayMs();
  const firstName = order.intake.name?.split(" ")[0] ?? "there";

  const email = await sendPlanEmail({
    to: order.intake.email,
    firstName,
    plan,
    scheduledAt: deliverAt,
  });

  if (!email.ok) {
    return NextResponse.json(
      { error: "Could not schedule your plan email. Please contact support." },
      { status: 502 }
    );
  }

  await updateOrder(orderId, {
    status: "paid",
    plan,
    deliverAt,
    paymentRef,
    resendEmailId: email.id,
  });

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
    const session = (await res.json()) as {
      payment_status?: string;
      client_reference_id?: string;
      metadata?: { orderId?: string };
    };
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
