import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = new Set(["http://localhost:4200"]);

function corsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    headers.set("Access-Control-Max-Age", "600");
    headers.set("Vary", "Origin");
  }
  return headers;
}

// Add CORS headers to every API response, including proxy-generated 401s.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/v1/")) return NextResponse.next();

  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // CORS preflight must be answered before authentication checks.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const publicPaths = ["/api/v1/health", "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/public/qr", "/api/v1/designs/generate"];
  if (!publicPaths.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)) && !request.cookies.has("tf_access")) {
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401, headers });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = { matcher: ["/api/v1/:path*"] };

