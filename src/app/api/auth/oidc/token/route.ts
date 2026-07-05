import { NextRequest, NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";
import { prismaAuthStore } from "@/lib/auth-store";
import { checkClientSecret, consumeCode, getClient } from "@/lib/oidc";

export const runtime = "nodejs";

// OIDC token 端点：code → access_token + id_token（RS256，客户端用 JWKS 验签）
export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  let body: Record<string, string> = {};
  if (ct.includes("application/json")) body = await req.json().catch(() => ({}));
  else {
    const f = await req.formData().catch(() => null);
    if (f) Array.from(f.entries()).forEach(([k, v]) => { body[k] = String(v); });
  }

  if (body.grant_type !== "authorization_code") return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  const clientId = body.client_id || "";
  const client = getClient(clientId);
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  if (!checkClientSecret(client, body.client_secret ?? null)) return NextResponse.json({ error: "invalid_client" }, { status: 401 });

  const r = await consumeCode({ code: body.code || "", clientId, redirectUri: body.redirect_uri || "", codeVerifier: body.code_verifier });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const user = await prismaAuthStore.findUserById(r.userId);
  if (!user) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });

  const core = await getAuthCore();
  const accessToken = await core.signFor(user);
  const idToken = await core.jwt.signCustom(
    { name: user.name, email: user.email, phone: user.phone, nonce: r.nonce ?? undefined, scope: r.scope },
    { subject: user.id, audience: clientId, expiresInSec: 3600 },
  );

  return NextResponse.json({ access_token: accessToken, id_token: idToken, token_type: "Bearer", expires_in: 3600, scope: r.scope });
}
