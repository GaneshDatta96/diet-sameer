import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import { Order } from "./types";

/**
 * Order store:
 * - Supabase (Postgres) in production
 * - Local JSON file under `.data/` for `next dev` without Supabase
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "orders.json");

let supabaseClient: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "";

  if (url && key) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    supabaseClient = null;
  }
  return supabaseClient;
}

function requireStorage(): void {
  if (!getSupabase() && process.env.VERCEL === "1") {
    throw new Error("MISSING_SUPABASE");
  }
}

type OrderRow = {
  id: string;
  created_at: number;
  status: string;
  email: string;
  payload: Order;
};

function toRow(order: Order): OrderRow {
  return {
    id: order.id,
    created_at: order.createdAt,
    status: order.status,
    email: order.intake.email.trim().toLowerCase(),
    payload: order,
  };
}

function fromPayload(data: { payload: Order } | null | undefined): Order | undefined {
  return data?.payload;
}

/* ----------------------------- file fallback ----------------------------- */

async function readAllFile(): Promise<Record<string, Order>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Record<string, Order>;
  } catch {
    return {};
  }
}

async function writeAllFile(orders: Record<string, Order>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(orders, null, 2), "utf8");
}

/* ----------------------------- public API ----------------------------- */

/** Find the most recent pending order for an email (Kajabi webhook matching). */
export async function findPendingOrderByEmail(
  email: string
): Promise<Order | undefined> {
  const normalized = email.trim().toLowerCase();
  const sb = getSupabase();

  if (sb) {
    const { data, error } = await sb
      .from("orders")
      .select("payload")
      .eq("status", "pending")
      .eq("email", normalized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[store] findPendingOrderByEmail:", error.message);
      throw new Error(error.message);
    }
    return fromPayload(data as { payload: Order } | null);
  }

  const all = await readAllFile();
  return Object.values(all)
    .filter(
      (o) =>
        o.status === "pending" &&
        o.intake.email.trim().toLowerCase() === normalized
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

export async function saveOrder(order: Order): Promise<Order> {
  requireStorage();
  const sb = getSupabase();

  if (sb) {
    const { error } = await sb.from("orders").upsert(toRow(order));
    if (error) {
      console.error("[store] saveOrder:", error.message);
      throw new Error(error.message);
    }
    return order;
  }

  const all = await readAllFile();
  all[order.id] = order;
  await writeAllFile(all);
  return order;
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const sb = getSupabase();

  if (sb) {
    const { data, error } = await sb
      .from("orders")
      .select("payload")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[store] getOrder:", error.message);
      throw new Error(error.message);
    }
    return fromPayload(data as { payload: Order } | null);
  }

  const all = await readAllFile();
  return all[id];
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>
): Promise<Order | undefined> {
  requireStorage();
  const existing = await getOrder(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  await saveOrder(updated);
  return updated;
}

/** Orders that are paid, have a plan, and are past deliverAt (cron fallback only). */
export async function getDueOrders(now = Date.now()): Promise<Order[]> {
  const sb = getSupabase();

  if (sb) {
    const { data, error } = await sb
      .from("orders")
      .select("payload")
      .eq("status", "paid");

    if (error) {
      console.error("[store] getDueOrders:", error.message);
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) => fromPayload(row as { payload: Order })!)
      .filter(
        (o) =>
          o.plan != null &&
          o.deliverAt != null &&
          o.deliverAt <= now &&
          !o.resendEmailId
      );
  }

  const all = await readAllFile();
  return Object.values(all).filter(
    (o) =>
      o.status === "paid" &&
      o.plan != null &&
      o.deliverAt != null &&
      o.deliverAt <= now &&
      !o.resendEmailId
  );
}
