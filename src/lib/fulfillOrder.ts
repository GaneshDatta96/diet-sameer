import { deliveryWindowHours, randomDeliveryDelayMs } from "./config";
import { sendFeedbackEmail, sendPlanEmail } from "./email";
import { feedbackDueAt } from "./feedbackEmail";
import { syncOrderToKajabi } from "./kajabi";
import { getOrder, updateOrder } from "./store";
import { generatePlan } from "./ai";

export interface FulfillResult {
  ok: boolean;
  deliverAt?: number;
  feedbackAt?: number;
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
      feedbackAt: order.feedbackAt,
      alreadyDone: true,
    };
  }

  const plan = await generatePlan(order.intake);
  const delayMs = randomDeliveryDelayMs();
  const now = Date.now();
  const deliverAt = delayMs > 0 ? now + delayMs : now;
  const feedbackAt = feedbackDueAt(now);
  const firstName = order.intake.name?.split(" ")[0] ?? "there";

  const email = await sendPlanEmail({
    to: order.intake.email,
    firstName,
    plan,
    scheduledAt: delayMs > 0 ? deliverAt : undefined,
  });

  if (!email.ok) {
    return {
      ok: false,
      error:
        "Could not send the plan email. Check SMTP_* (or RESEND_API_KEY) on the server.",
    };
  }

  // Schedule feedback: Resend uses scheduled_at; SMTP defers to cron.
  const feedback = await sendFeedbackEmail({
    to: order.intake.email,
    firstName,
    scheduledAt: feedbackAt,
  });

  await updateOrder(orderId, {
    status: "paid",
    plan,
    deliverAt,
    paymentRef,
    resendEmailId: email.id,
    feedbackAt,
    feedbackEmailId: feedback.deferred ? undefined : feedback.id,
    feedbackSentAt:
      feedback.ok && !feedback.deferred && feedbackAt <= now
        ? now
        : undefined,
  });

  await syncOrderToKajabi(order.intake, orderId).catch((err) =>
    console.error("[kajabi] contact sync failed:", err)
  );

  return { ok: true, deliverAt, feedbackAt };
}

export function fulfillResponseBody(result: FulfillResult) {
  return {
    ok: result.ok,
    deliverAt: result.deliverAt,
    feedbackAt: result.feedbackAt,
    window: deliveryWindowHours(),
    alreadyDone: result.alreadyDone,
  };
}
