import { NextRequest } from "next/server";
import { logout } from "@/services/auth/auth.service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return logout(request); }

