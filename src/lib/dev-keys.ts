// JWT 签名密钥的稳定来源。
// 关键：Next dev 会给 src 外、相对引入的模块（packages/auth-core）按 route 入口生成多个实例，
// 若每个实例各自生成临时密钥，则 JWKS 端点 / 签发 / 验签三处用的是不同密钥，SSO 必然验不过。
// 因此密钥必须有「单一来源」：生产用环境变量；dev 落盘到 gitignored 文件，所有实例读同一把钥。
import { generateKeyPairSync } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export type JwtKeys = { privateKeyPem?: string; publicKeyPem?: string };

export function resolveJwtKeys(): JwtKeys {
  if (process.env.AUTH_JWT_PRIVATE_KEY && process.env.AUTH_JWT_PUBLIC_KEY) {
    return { privateKeyPem: process.env.AUTH_JWT_PRIVATE_KEY, publicKeyPem: process.env.AUTH_JWT_PUBLIC_KEY };
  }
  // 生产必须显式配置密钥；绝不落临时钥（重启即失效、且多实例不一致）
  if (process.env.NODE_ENV === "production") return {};

  const dir = path.join(process.cwd(), ".auth-dev-keys");
  const file = path.join(dir, "jwt.json");

  const { privateKey, publicKey } = (() => {
    try {
      if (existsSync(file)) {
        const j = JSON.parse(readFileSync(file, "utf8"));
        if (j.privateKeyPem && j.publicKeyPem) return { privateKey: j.privateKeyPem, publicKey: j.publicKeyPem };
      }
    } catch {
      /* 文件损坏：下面重新生成 */
    }
    return generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
  })();

  const keys: JwtKeys = { privateKeyPem: privateKey, publicKeyPem: publicKey };
  // 仅当文件不存在时写入（wx），避免并发的多个模块实例互相覆盖；随后统一以磁盘为准
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(keys), { flag: "wx", mode: 0o600 });
  } catch {
    /* 已存在或写失败 */
  }
  try {
    const j = JSON.parse(readFileSync(file, "utf8"));
    if (j.privateKeyPem && j.publicKeyPem) return j; // 所有实例收敛到磁盘上的同一把钥
  } catch {
    /* 落盘失败：退回内存钥（单实例仍可用） */
  }
  return keys;
}
