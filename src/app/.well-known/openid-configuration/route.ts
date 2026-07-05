import { NextResponse } from "next/server";
import { issuerUrl } from "@/lib/oidc";

export const runtime = "nodejs";

// OIDC 发现文档：第三方应用据此自动发现各端点
export function GET() {
  const iss = issuerUrl();
  return NextResponse.json({
    issuer: "clawnote-auth",
    authorization_endpoint: `${iss}/api/auth/oidc/authorize`,
    token_endpoint: `${iss}/api/auth/oidc/token`,
    userinfo_endpoint: `${iss}/api/auth/oidc/userinfo`,
    jwks_uri: `${iss}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email", "phone"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],
  });
}
