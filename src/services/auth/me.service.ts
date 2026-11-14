import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/auth";

export async function me() {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  return user ? success(user) : failure("User tidak ditemukan", 404);
}

