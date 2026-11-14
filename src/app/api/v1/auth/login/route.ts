import { NextRequest } from "next/server";
import { login } from "@/services/auth/auth.service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return login(request); }

