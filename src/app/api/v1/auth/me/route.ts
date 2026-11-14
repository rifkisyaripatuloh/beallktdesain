import { me } from "@/services/auth/me.service";
export const runtime = "nodejs";
export async function GET() { return me(); }

