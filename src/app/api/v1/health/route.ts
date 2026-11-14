import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({ success: true, data: { status: "ok", database: "ok" } }); }
  catch { return NextResponse.json({ success: false, data: { status: "degraded", database: "unavailable" } }, { status: 503 }); }
}

