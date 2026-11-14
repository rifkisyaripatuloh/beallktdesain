import { NextRequest } from "next/server";
import { generateDesign } from "@/services/design/ai-design.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "JSON tidak valid" }, { status: 400 }); }
  return generateDesign(body);
}

