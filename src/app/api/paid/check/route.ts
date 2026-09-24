import { NextResponse } from "next/server";
import { hasUnusedPaidEntitlement } from "@/lib/entitlements";

/** Check whether an email has an unused Kajabi payment ready for the questionnaire. */
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ paid: false, error: "Invalid email" }, { status: 400 });
  }

  try {
    const paid = await hasUnusedPaidEntitlement(email);
    return NextResponse.json({ paid, email: email.toLowerCase() });
  } catch (err) {
    console.error("[paid/check]", err);
    return NextResponse.json({ paid: false, error: "Lookup failed" }, { status: 500 });
  }
}
