import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const secret = process.env.JWT_ACCESS_SECRET;
if (!secret && process.env.NODE_ENV === "production") throw new Error("JWT_ACCESS_SECRET is required");
const key = new TextEncoder().encode(secret ?? "local-development-only-secret-change-me-32-bytes");
const cookieName = "tf_access";

export async function createAccessToken(userId: string) {
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m").sign(key);
}

export async function getCurrentUserId() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}

export async function setAccessCookie(token: string) {
  (await cookies()).set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 15 * 60,
  });
}

export async function clearAccessCookie() {
  (await cookies()).set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

