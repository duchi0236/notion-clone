import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Keep in sync with src/lib/runtime-mode.ts (middleware runs on the edge and
// must not import server-only modules).
const LOCAL_MODE =
  process.env.CLAWNOTE_LOCAL_MODE === "1" || process.env.NODE_ENV !== "production";

// APIs that must stay reachable without a session:
// - /api/auth/*: login, register, OTP, OIDC, WeChat callbacks (NextAuth itself)
// - /api/health: container / uptime probes
// - /api/agent/*: authenticated separately via Bearer token (verifyAgentRequest)
const PUBLIC_API = [/^\/api\/auth(\/|$)/, /^\/api\/health$/, /^\/api\/agent(\/|$)/];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/clawnote", request.url));
  }

  if (pathname.startsWith("/api/")) {
    // CSRF hardening: browsers always send Origin on cross-site mutating
    // requests; reject when it doesn't match. Server-to-server calls (agent,
    // OIDC token exchange, mobile apps) send no Origin header and pass.
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin) {
        let originHost = "";
        try {
          originHost = new URL(origin).host;
        } catch {
          /* malformed origin → reject below */
        }
        if (originHost !== request.nextUrl.host) {
          return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
        }
      }
    }

    if (!LOCAL_MODE && !PUBLIC_API.some((pattern) => pattern.test(pathname))) {
      const token = await getToken({ req: request });
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
