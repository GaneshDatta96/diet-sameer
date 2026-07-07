import { sendPlanEmail } from "./email";
import { getDueOrders, getOrder, updateOrder } from "./store";

/**
 * Deliver a single order if it's paid, has a plan, and hasn't been sent yet.
 * Safe to call multiple times (status guard prevents double-send).
 */
export async function deliverOrder(id: string): Promise<boolean> {
  const order = await getOrder(id);
  if (!order || order.status !== "paid" || !order.plan) return false;

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

/** Deliver everything that's due. Called by the cron endpoint. */
export async function deliverDueOrders(): Promise<number> {
  const due = await getDueOrders();
  let sent = 0;
  for (const o of due) {
    if (await deliverOrder(o.id)) sent++;
  }
  return sent;
}

/**
 * Best-effort in-process scheduler for single-server / local runs. On a
 * serverless host this won't survive between invocations, which is why the
 * cron endpoint (/api/cron/deliver) is the source of truth for reliability.
 */
export function scheduleDelivery(id: string, deliverAt: number) {
  if (process.env.CF_PAGES === "1" || process.env.CLOUDFLARE_WORKERS === "1") {
    return;
  }
  const delay = Math.max(0, deliverAt - Date.now());
  // Node's setTimeout caps around 24.8 days; our window is hours, so this is fine.
  setTimeout(() => {
    deliverOrder(id).catch((err) =>
      console.error(`[deliver] failed for ${id}:`, err)
    );
  }, delay);
}
