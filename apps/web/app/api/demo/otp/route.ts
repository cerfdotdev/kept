import { NextRequest, NextResponse } from "next/server";
import { db, schema, eq, desc, and } from "@/lib/db";

/**
 * DEMO MODE ONLY: returns the latest unconsumed OTP for an email so the
 * pilot can be completed without an email provider. Disabled unless
 * DEMO_MODE=true (and even then, only for the requesting email's latest code).
 */
export async function GET(request: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const email = request.nextUrl.searchParams.get("email")?.toLowerCase();
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  const rows = await db
    .select({ code: schema.demoOtps.code, createdAt: schema.demoOtps.createdAt })
    .from(schema.demoOtps)
    .where(and(eq(schema.demoOtps.email, email), eq(schema.demoOtps.consumed, false)))
    .orderBy(desc(schema.demoOtps.createdAt))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, code: rows[0].code, createdAt: rows[0].createdAt });
}
