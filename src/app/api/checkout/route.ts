import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getOrder } from "@/lib/store";

/**
 * Create a checkout. With a Stripe key we create a real Checkout Session;
 * without one we return a mock URL so the whole flow works during review.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderId = (body as { orderId?: string })?.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!config.stripe.enabled) {
    // Mock mode: skip straight to the confirmation page.
    return NextResponse.json({
      mock: true,
      url: `/confirm?orderId=${orderId}&mock=1`,
    });
  }

  try {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set(
      "success_url",
      `${config.appUrl}/confirm?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`
    );
    params.set("cancel_url", `${config.appUrl}/plan?canceled=1`);
    params.set("client_reference_id", orderId);
    params.set("customer_email", order.intake.email);
    params.set("metadata[orderId]", orderId);

    if (config.stripe.priceId) {
      params.set("line_items[0][price]", config.stripe.priceId);
      params.set("line_items[0][quantity]", "1");
    } else {
      params.set("line_items[0][price_data][currency]", config.price.currency);
      params.set(
        "line_items[0][price_data][product_data][name]",
        "Gut Freedom · 7-Day Personalized Meal Plan"
      );
      params.set(
        "line_items[0][price_data][unit_amount]",
        String(Math.round(config.price.amount * 100))
      );
      params.set("line_items[0][quantity]", "1");
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.stripe.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[checkout] stripe error:", res.status, text);
      return NextResponse.json({ error: "Payment setup failed" }, { status: 502 });
    }
    const session = await res.json();
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Payment setup failed" }, { status: 500 });
  }
}
