import { NextResponse } from "next/server";
import { getOrder } from "@/lib/store";

/** Lightweight status endpoint for the confirmation page (no plan leakage). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: order.status,
    deliverAt: order.deliverAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    firstName: order.intake.name?.split(" ")[0] ?? "",
    email: order.intake.email,
  });
}
