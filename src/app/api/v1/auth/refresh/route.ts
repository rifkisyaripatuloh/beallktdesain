import { NextRequest } from "next/server";
import { refresh } from "@/services/auth/auth.service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return refresh(request); }

