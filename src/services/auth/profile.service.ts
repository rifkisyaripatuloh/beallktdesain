import { NextRequest } from "next/server";
import { clearAccessCookie } from "@/lib/auth";
import { failure, success } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({ name: z.string().trim().min(2).max(120) });
export async function updateProfile(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return failure("JSON body tidak valid", 400); }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return failure("Validasi gagal", 422, parsed.error.flatten());
  const user = await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name }, select: { id: true, name: true, email: true, role: true } });
  return success(user, "Profil diperbarui");
}

const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(128) });
import argon2 from "argon2";
export async function changePassword(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return failure("JSON body tidak valid", 400); }
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return failure("Validasi gagal", 422, parsed.error.flatten());
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await argon2.verify(user.password, parsed.data.currentPassword))) return failure("Password saat ini salah", 400);
  await prisma.$transaction([prisma.user.update({ where: { id: userId }, data: { password: await argon2.hash(parsed.data.newPassword, { type: argon2.argon2id }) } }), prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
  await clearAccessCookie();
  return success(null, "Password diperbarui. Silakan login kembali.");
}

