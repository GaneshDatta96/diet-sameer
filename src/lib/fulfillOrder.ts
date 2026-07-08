import { deliveryWindowHours, randomDeliveryDelayMs } from "./config";
import { sendPlanEmail } from "./email";
import { syncOrderToKajabi } from "./kajabi";
import { getOrder, updateOrder } from "./store";
import { generatePlan } from "./ai";

export interface FulfillResult {
  ok: boolean;
  deliverAt?: number;
  alreadyDone?: boolean;
  error?: string;
}

/** Generate the plan, schedule email delivery, and sync to Kajabi. */
export async function fulfillOrder(
  orderId: string,
  paymentRef: string
): Promise<FulfillResult> {
  const order = await getOrder(orderId);
  if (!order) {
    return { ok: false, error: "Order not found" };
  }

  if (order.status === "paid" || order.status === "delivered") {
    return {
      ok: true,
      deliverAt: order.deliverAt,
      alreadyDone: true,
    };
  }

  const plan = await generatePlan(order.intake);
  const delayMs = randomDeliveryDelayMs();
  const deliverAt = delayMs > 0 ? Date.now() + delayMs : Date.now();
  const firstName = order.intake.name?.split(" ")[0] ?? "there";

  const email = await sendPlanEmail({
    to: order.intake.email,
    firstName,
    plan,
    scheduledAt: delayMs > 0 ? deliverAt : undefined,
  });

  if (!email.ok) {
    return { ok: false, error: "Could not schedule plan email" };
  }

  await updateOrder(orderId, {
    status: "paid",
    plan,
    deliverAt,
    paymentRef,
    resendEmailId: email.id,
  });

  await syncOrderToKajabi(order.intake, orderId).catch((err) =>
    console.error("[kajabi] contact sync failed:", err)
  );

  return { ok: true, deliverAt };
}

export function fulfillResponseBody(result: FulfillResult) {
  return {
    ok: result.ok,
    deliverAt: result.deliverAt,
    window: deliveryWindowHours(),
    alreadyDone: result.alreadyDone,
  };
}
