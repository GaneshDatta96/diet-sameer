import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseIntake } from "@/lib/validate";
import { saveOrder } from "@/lib/store";
import { Order } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { intake, error } = parseIntake(body);
    if (!intake) {
      return NextResponse.json({ error: error ?? "Invalid input" }, { status: 400 });
    }

    const order: Order = {
      id: randomUUID(),
      createdAt: Date.now(),
      status: "pending",
      intake,
    };
    await saveOrder(order);

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("[order] failed:", err);
    if (err instanceof Error && err.message === "MISSING_REDIS") {
      return NextResponse.json(
        {
          error:
            "Order storage is not configured on the server. Add Upstash Redis in Vercel project settings.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not save your order. Please try again." },
      { status: 500 }
    );
  }
}
