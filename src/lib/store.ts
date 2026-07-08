import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import { Order } from "./types";

/**
 * Order store:
 * - Upstash Redis in production (add Redis from Vercel Marketplace / Storage)
 * - Local JSON file under `.data/` for `next dev`
 */

const ORDERS_KEY = "orders";
const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "orders.json");

function getRedis(): Redis | null {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return Redis.fromEnv();
  }
  return null;
}

async function readAll(): Promise<Record<string, Order>> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(ORDERS_KEY);
    if (!raw) return {};
    return typeof raw === "string"
      ? (JSON.parse(raw) as Record<string, Order>)
      : (raw as Record<string, Order>);
  }

  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Record<string, Order>;
  } catch {
    return {};
  }
}

async function writeAll(orders: Record<string, Order>): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(ORDERS_KEY, JSON.stringify(orders));
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(orders, null, 2), "utf8");
}

/** Find the most recent pending order for an email (Kajabi webhook matching). */
export async function findPendingOrderByEmail(
  email: string
): Promise<Order | undefined> {
  const all = await readAll();
  const normalized = email.trim().toLowerCase();
  return Object.values(all)
    .filter(
      (o) =>
        o.status === "pending" &&
        o.intake.email.trim().toLowerCase() === normalized
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
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

/** Orders that are paid, have a plan, and are past deliverAt (cron fallback only). */
export async function getDueOrders(now = Date.now()): Promise<Order[]> {
  const all = await readAll();
  return Object.values(all).filter(
    (o) =>
      o.status === "paid" &&
      o.plan != null &&
      o.deliverAt != null &&
      o.deliverAt <= now &&
      !o.resendEmailId
  );
}
