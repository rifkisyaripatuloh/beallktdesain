import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { failure, success, validationFailure } from "@/lib/api-response";
import { createAccessToken, setAccessCookie } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/validators/auth";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";

const refreshDays = 7;
function refreshCookieOptions(maxAge: number) { return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/v1/auth", maxAge }; }

export async function register(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return failure("JSON body tidak valid", 400); }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationFailure(parsed.error);
  const { name, email, password } = parsed.data;
  try {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), password: hash }, select: { id: true, name: true, email: true, role: true } });
    return success(user, "Registrasi berhasil", 201);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return failure("Email sudah terdaftar", 409);
    throw error;
  }
}

export async function login(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return failure("JSON body tidak valid", 400); }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationFailure(parsed.error);
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive || !(await argon2.verify(user.password, parsed.data.password))) return failure("Email atau password salah", 401);
  const refreshToken = randomBytes(48).toString("base64url");
  const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + refreshDays * 86400 * 1000);
  await prisma.session.create({ data: { userId: user.id, refreshTokenHash, expiresAt } });
  const response = success({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, "Login berhasil");
  await setAccessCookie(await createAccessToken(user.id));
  response.cookies.set("tf_refresh", refreshToken, refreshCookieOptions(refreshDays * 86400));
  return response;
}

export async function logout(request: NextRequest) {
  const token = request.cookies.get("tf_refresh")?.value;
  if (token) await prisma.session.updateMany({ where: { refreshTokenHash: createHash("sha256").update(token).digest("hex"), revokedAt: null }, data: { revokedAt: new Date() } });
  const response = success(null, "Logout berhasil");
  response.cookies.set("tf_access", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set("tf_refresh", "", refreshCookieOptions(0));
  return response;
}

export async function refresh(request: NextRequest) {
  const token = request.cookies.get("tf_refresh")?.value;
  if (!token) return failure("Refresh session tidak ditemukan", 401);
  const oldHash = createHash("sha256").update(token).digest("hex");
  const session = await prisma.session.findFirst({ where: { refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } }, include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  if (!session) return failure("Refresh session tidak valid", 401);
  const newToken = randomBytes(48).toString("base64url");
  const newHash = createHash("sha256").update(newToken).digest("hex");
  const expiresAt = new Date(Date.now() + refreshDays * 86400 * 1000);
  const updated = await prisma.session.updateMany({ where: { id: session.id, refreshTokenHash: oldHash, revokedAt: null }, data: { refreshTokenHash: newHash, expiresAt } });
  if (updated.count !== 1) return failure("Refresh token sudah digunakan", 401);
  const response = success({ user: session.user }, "Session diperbarui");
  await setAccessCookie(await createAccessToken(session.user.id));
  response.cookies.set("tf_refresh", newToken, refreshCookieOptions(refreshDays * 86400));
  return response;
}
