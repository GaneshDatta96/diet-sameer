import { sendFeedbackEmail, sendPlanEmail } from "./email";
import {
  getDueFeedbackOrders,
  getDueOrders,
  getOrder,
  updateOrder,
} from "./store";

/**
 * Deliver a single order immediately (cron fallback for orders that were not
 * scheduled via Resend, e.g. if scheduling failed silently).
 */
export async function deliverOrder(id: string): Promise<boolean> {
  const order = await getOrder(id);
  if (!order || order.status !== "paid" || !order.plan) return false;
  if (order.resendEmailId) return false;

  const firstName = order.intake.name?.split(" ")[0] ?? "there";
  const result = await sendPlanEmail({
    to: order.intake.email,
    firstName,
    plan: order.plan,
  });

  if (result.ok) {
    await updateOrder(id, { status: "delivered", deliveredAt: Date.now() });
    return true;
  }
  return false;
}

/** Cron fallback — only picks up orders without a Resend schedule. */
export async function deliverDueOrders(): Promise<number> {
  const due = await getDueOrders();
  let sent = 0;
  for (const o of due) {
    if (await deliverOrder(o.id)) sent++;
  }
  return sent;
}

/** Send due 48h feedback emails (SMTP path; Resend schedules at fulfill). */
export async function sendDueFeedbackEmails(): Promise<number> {
  const due = await getDueFeedbackOrders();
  let sent = 0;
  for (const o of due) {
    const firstName = o.intake.name?.split(" ")[0] ?? "there";
    const result = await sendFeedbackEmail({
      to: o.intake.email,
      firstName,
    });
    if (result.ok && !result.deferred) {
      await updateOrder(o.id, {
        feedbackSentAt: Date.now(),
        feedbackEmailId: result.id,
      });
      sent++;
    }
  }
  return sent;
}
