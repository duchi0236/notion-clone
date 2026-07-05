import { NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";

export const runtime = "nodejs";

// JWKS：公钥集，供任意客户端验签 id_token / access_token（SSO 解耦关键）
export async function GET() {
  const core = await getAuthCore();
  const jwks = await core.jwks();
  return NextResponse.json(jwks, { headers: { "cache-control": "public, max-age=3600" } });
}
