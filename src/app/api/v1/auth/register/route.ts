import { NextRequest } from "next/server";
import { register } from "@/services/auth/auth.service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return register(request); }

