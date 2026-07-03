import { promises as fs } from "fs";
import path from "path";
import { Order } from "./types";

/**
 * Minimal file-based order store — perfect for local review and a single-server
 * deployment. For a scaled production deployment swap this for a real database
 * (Postgres, Supabase, etc.); the interface below is all the app depends on.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "orders.json");

async function readAll(): Promise<Record<string, Order>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Record<string, Order>;
  } catch {
    return {};
  }
}

async function writeAll(orders: Record<string, Order>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(orders, null, 2), "utf8");
}

export async function saveOrder(order: Order): Promise<Order> {
  const all = await readAll();
  all[order.id] = order;
  await writeAll(all);
  return order;
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const all = await readAll();
  return all[id];
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>
): Promise<Order | undefined> {
  const all = await readAll();
  const existing = all[id];
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  all[id] = updated;
  await writeAll(all);
  return updated;
}

/** Orders that are paid and past their scheduled delivery time. */
export async function getDueOrders(now = Date.now()): Promise<Order[]> {
  const all = await readAll();
  return Object.values(all).filter(
    (o) =>
      o.status === "paid" &&
      o.plan != null &&
      o.deliverAt != null &&
      o.deliverAt <= now
  );
}
