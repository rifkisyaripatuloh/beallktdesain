import { NextRequest } from "next/server";
import { deleteDesign, getDesign, updateDesign } from "@/services/design/design.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  return getDesign(id);
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "JSON tidak valid" }, { status: 400 }); }
  return updateDesign(id, body);
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  return deleteDesign(id);
}

