import { promises as fs } from "fs";
import path from "path";
import { getSql, requireDatabase } from "./db";
import { Order } from "./types";

/**
 * Order store:
 * - Neon Postgres when DATABASE_URL is set (production / Vercel)
 * - Local JSON under `.data/` for `next dev` without Neon
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "orders.json");

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

function fromPayload(
  data: { payload: Order } | null | undefined
): Order | undefined {
  return data?.payload;
}

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

/** Find the most recent pending order for an email (Kajabi webhook matching). */
export async function findPendingOrderByEmail(
  email: string
): Promise<Order | undefined> {
  const normalized = email.trim().toLowerCase();
  const sql = getSql();

  if (sql) {
    const rows = await sql`
      select payload
      from orders
      where status = 'pending' and email = ${normalized}
      order by created_at desc
      limit 1
    `;
    return fromPayload(rows[0] as { payload: Order } | undefined);
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
  requireDatabase();
  const sql = getSql();
  const row = toRow(order);

  if (sql) {
    await sql`
      insert into orders (id, created_at, status, email, payload)
      values (
        ${row.id},
        ${row.created_at},
        ${row.status},
        ${row.email},
        ${JSON.stringify(row.payload)}::jsonb
      )
      on conflict (id) do update set
        created_at = excluded.created_at,
        status = excluded.status,
        email = excluded.email,
        payload = excluded.payload
    `;
    return order;
  }

  const all = await readAllFile();
  all[order.id] = order;
  await writeAllFile(all);
  return order;
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const sql = getSql();

  if (sql) {
    const rows = await sql`
      select payload from orders where id = ${id} limit 1
    `;
    return fromPayload(rows[0] as { payload: Order } | undefined);
  }

  const all = await readAllFile();
  return all[id];
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>
): Promise<Order | undefined> {
  requireDatabase();
  const existing = await getOrder(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  await saveOrder(updated);
  return updated;
}

/** Orders that are paid, have a plan, and are past deliverAt (cron fallback only). */
export async function getDueOrders(now = Date.now()): Promise<Order[]> {
  const sql = getSql();

  if (sql) {
    const rows = await sql`
      select payload from orders where status = 'paid'
    `;
    return rows
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

/** Paid/delivered orders whose 48h feedback email is due (SMTP / cron path). */
export async function getDueFeedbackOrders(now = Date.now()): Promise<Order[]> {
  const isDue = (o: Order) =>
    (o.status === "paid" || o.status === "delivered") &&
    o.feedbackAt != null &&
    o.feedbackAt <= now &&
    !o.feedbackSentAt &&
    !o.feedbackEmailId;

  const sql = getSql();

  if (sql) {
    const rows = await sql`
      select payload from orders where status in ('paid', 'delivered')
    `;
    return rows
      .map((row) => fromPayload(row as { payload: Order })!)
      .filter(isDue);
  }

  const all = await readAllFile();
  return Object.values(all).filter(isDue);
}

/** Paid/delivered orders whose Day 7 email is due (SMTP / cron path). */
export async function getDueDay7Orders(now = Date.now()): Promise<Order[]> {
  const isDue = (o: Order) =>
    (o.status === "paid" || o.status === "delivered") &&
    o.day7At != null &&
    o.day7At <= now &&
    !o.day7SentAt &&
    !o.day7EmailId;

  const sb = getSupabase();

  if (sb) {
    const { data, error } = await sb
      .from("orders")
      .select("payload")
      .in("status", ["paid", "delivered"]);

    if (error) {
      console.error("[store] getDueDay7Orders:", error.message);
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) => fromPayload(row as { payload: Order })!)
      .filter(isDue);
  }

  const all = await readAllFile();
  return Object.values(all).filter(isDue);
}
