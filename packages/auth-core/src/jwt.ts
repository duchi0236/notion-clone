// JWT 签发 / 校验 / JWKS。RS256 非对称：Auth 服务用私钥签，各客户端用公钥(JWKS)验签，
// 客户端无需直连身份库。私钥缺省时临时生成（仅 dev，重启即失效）。
import { SignJWT, jwtVerify, importPKCS8, importSPKI, exportJWK, generateKeyPair, type KeyLike, type JWK } from "jose";
import type { AuthClaims, JwtConfig } from "./types";

export interface JwtService {
  sign(claims: AuthClaims): Promise<string>;
  verify(token: string): Promise<AuthClaims>;
  // OIDC id_token 等：自定义 audience / 主体 / 过期 / 附加声明
  signCustom(payload: Record<string, unknown>, opts: { subject: string; audience: string; expiresInSec?: number }): Promise<string>;
  jwks(): Promise<{ keys: JWK[] }>;
  issuer: string;
  kid: string;
}

export async function createJwtService(cfg: JwtConfig): Promise<JwtService> {
  const alg = "RS256";
  const ttl = cfg.ttlSec ?? 7 * 24 * 3600;
  const kid = cfg.kid ?? "auth-core-1";

  let privateKey: KeyLike;
  let publicKey: KeyLike;
  if (cfg.privateKeyPem && cfg.publicKeyPem) {
    privateKey = await importPKCS8(cfg.privateKeyPem, alg);
    publicKey = await importSPKI(cfg.publicKeyPem, alg);
  } else {
    const pair = await generateKeyPair(alg, { extractable: true });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  }

  const pubJwk = await exportJWK(publicKey);
  pubJwk.kid = kid;
  pubJwk.alg = alg;
  pubJwk.use = "sig";

  return {
    kid,
    issuer: cfg.issuer,
    async signCustom(payload, opts) {
      return new SignJWT(payload)
        .setProtectedHeader({ alg, kid })
        .setSubject(opts.subject)
        .setIssuedAt()
        .setIssuer(cfg.issuer)
        .setAudience(opts.audience)
        .setExpirationTime(`${opts.expiresInSec ?? 3600}s`)
        .sign(privateKey);
    },
    async sign(claims) {
      const jwt = new SignJWT({ tv: claims.tv, email: claims.email ?? null, phone: claims.phone ?? null, name: claims.name ?? null })
        .setProtectedHeader({ alg, kid })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setIssuer(cfg.issuer)
        .setExpirationTime(`${ttl}s`);
      if (cfg.audience) jwt.setAudience(cfg.audience);
      return jwt.sign(privateKey);
    },
    async verify(token) {
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: cfg.issuer,
        audience: cfg.audience,
      });
      return {
        sub: String(payload.sub),
        tv: Number(payload.tv ?? 0),
        email: (payload.email as string | null) ?? null,
        phone: (payload.phone as string | null) ?? null,
        name: (payload.name as string | null) ?? null,
      };
    },
    async jwks() {
      return { keys: [pubJwk] };
    },
  };
}
