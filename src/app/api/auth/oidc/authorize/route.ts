import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClient, isValidRedirect, issueCode } from "@/lib/oidc";

export const runtime = "nodejs";

// OIDC 授权端点：校验 client/redirect → 要求登录 → 颁发一次性 code 回跳
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("client_id") || "";
  const redirectUri = sp.get("redirect_uri") || "";
  const responseType = sp.get("response_type") || "";
  const scope = sp.get("scope") || "openid profile";
  const state = sp.get("state") || "";
  const nonce = sp.get("nonce") || undefined;
  const codeChallenge = sp.get("code_challenge") || undefined;

  const client = getClient(clientId);
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  if (!isValidRedirect(client, redirectUri)) return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });

  if (responseType !== "code") {
    const u = new URL(redirectUri);
    u.searchParams.set("error", "unsupported_response_type");
    if (state) u.searchParams.set("state", state);
    return NextResponse.redirect(u);
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  try {
    const code = await issueCode({ clientId, userId, redirectUri, scope, nonce, codeChallenge });
    const u = new URL(redirectUri);
    u.searchParams.set("code", code);
    if (state) u.searchParams.set("state", state);
    return NextResponse.redirect(u);
  } catch (e) {
    console.error("[oidc/authorize] issueCode failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
