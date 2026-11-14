import { NextRequest } from "next/server";
import { changePassword } from "@/services/auth/profile.service";
export const runtime = "nodejs";
export async function PATCH(request: NextRequest) { return changePassword(request); }

