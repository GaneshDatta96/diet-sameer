import { NextResponse } from "next/server";
import { config, deliveryWindowHours } from "@/lib/config";
import { fulfillOrder, fulfillResponseBody } from "@/lib/fulfillOrder";
import { getOrder } from "@/lib/store";

/**
 * Confirm payment and fulfill the order.
 * - Kajabi: webhook fulfills; this endpoint polls until paid or returns status.
 * - Stripe: verifies Checkout Session, then fulfills.
 * - Mock: fulfills immediately when Stripe/Kajabi are not configured.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderId?: string;
    sessionId?: string;
    mock?: boolean;
    kajabi?: boolean;
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

  if (body?.kajabi) {
    const fresh = await getOrder(orderId);
    if (fresh?.status === "paid" || fresh?.status === "delivered") {
      return NextResponse.json({
        ok: true,
        deliverAt: fresh.deliverAt,
        window: deliveryWindowHours(),
        alreadyDone: true,
      });
    }
    return NextResponse.json(
      { ok: false, waiting: true, message: "Waiting for payment confirmation…" },
      { status: 202 }
    );
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

  const result = await fulfillOrder(orderId, paymentRef);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not fulfill your order" },
      { status: 502 }
    );
  }

  return NextResponse.json(fulfillResponseBody(result));
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
