// 最小 OIDC/OAuth2 授权码流程（SSO）：第三方应用 → authorize 拿 code → token 换 id_token。
// 应用注册表来自环境变量 OIDC_CLIENTS（JSON）；授权码存 DB（一次性）。
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export type OidcClient = { clientId: string; clientSecret?: string; redirectUris: string[]; name?: string };

function loadClients(): OidcClient[] {
  const raw = process.env.OIDC_CLIENTS;
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    } catch {
      /* ignore */
    }
  }
  // 开发期默认客户端，便于本地联调（生产请用 OIDC_CLIENTS 覆盖）
  if (process.env.NODE_ENV !== "production") {
    return [{ clientId: "demo-client", clientSecret: "demo-secret", redirectUris: ["http://localhost:8080/callback", "https://oidcdebugger.com/debug"], name: "Demo Client" }];
  }
  return [];
}

export function getClient(clientId: string): OidcClient | null {
  return loadClients().find((c) => c.clientId === clientId) ?? null;
}

export function isValidRedirect(client: OidcClient, redirectUri: string): boolean {
  return client.redirectUris.includes(redirectUri);
}

export function checkClientSecret(client: OidcClient, secret: string | null): boolean {
  if (!client.clientSecret) return true; // 公共客户端（PKCE）
  if (!secret) return false;
  const a = Buffer.from(client.clientSecret);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function issueCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  nonce?: string;
  codeChallenge?: string;
}): Promise<string> {
  const code = randomBytes(24).toString("base64url");
  await prisma.oAuthCode.create({
    data: {
      code,
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      scope: input.scope,
      nonce: input.nonce ?? null,
      codeChallenge: input.codeChallenge ?? null,
      expiresAt: new Date(Date.now() + 60_000), // 60s 一次性
    },
  });
  return code;
}

export async function consumeCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<{ ok: true; userId: string; scope: string; nonce: string | null } | { ok: false; error: string }> {
  const rec = await prisma.oAuthCode.findUnique({ where: { code: input.code } });
  if (!rec || rec.consumedAt || rec.expiresAt < new Date()) return { ok: false, error: "invalid_grant" };
  if (rec.clientId !== input.clientId || rec.redirectUri !== input.redirectUri) return { ok: false, error: "invalid_grant" };
  if (rec.codeChallenge) {
    if (!input.codeVerifier) return { ok: false, error: "invalid_request" };
    const challenge = createHash("sha256").update(input.codeVerifier).digest("base64url");
    if (challenge !== rec.codeChallenge) return { ok: false, error: "invalid_grant" };
  }
  await prisma.oAuthCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
  return { ok: true, userId: rec.userId, scope: rec.scope, nonce: rec.nonce };
}

export function issuerUrl(): string {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}
