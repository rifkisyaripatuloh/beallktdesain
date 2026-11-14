import { NextRequest } from "next/server";
import { updateProfile } from "@/services/auth/profile.service";
export const runtime = "nodejs";
export async function PATCH(request: NextRequest) { return updateProfile(request); }

