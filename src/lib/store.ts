import { getCloudflareContext } from "@opennextjs/cloudflare";
import { promises as fs } from "fs";
import path from "path";
import { Order } from "./types";

/**
 * Order store with two backends:
 * - Cloudflare KV (`ORDER_STORE` binding) in production Workers
 * - Local JSON file under `.data/` for `next dev` and single-node runs
 */

const ORDERS_KEY = "orders";
const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "orders.json");

interface OrderKv {
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

async function getKv(): Promise<OrderKv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.ORDER_STORE ?? null;
  } catch {
    return null;
  }
}

async function readAll(): Promise<Record<string, Order>> {
  const kv = await getKv();
  if (kv) {
    const raw = await kv.get(ORDERS_KEY, "text");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Order>;
  }

  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Record<string, Order>;
  } catch {
    return {};
  }
}

async function writeAll(orders: Record<string, Order>): Promise<void> {
  const kv = await getKv();
  if (kv) {
    await kv.put(ORDERS_KEY, JSON.stringify(orders));
    return;
  }

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
