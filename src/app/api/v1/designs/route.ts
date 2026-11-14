import { NextRequest } from "next/server";
import { createDesign, listDesigns } from "@/services/design/design.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return listDesigns(request.nextUrl.searchParams.get("search") ?? undefined);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "JSON tidak valid" }, { status: 400 }); }
  return createDesign(body);
}

