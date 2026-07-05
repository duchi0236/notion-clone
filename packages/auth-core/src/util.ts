import { randomInt, createHmac, randomBytes, timingSafeEqual } from "crypto";

// E.164 归一化（默认 +86）
export function normalizePhone(raw: string, defaultCountry = "86"): string {
  const d = (raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("00")) return "+" + d.slice(2);
  if (defaultCountry === "86" && d.length === 11 && d.startsWith("1")) return "+86" + d;
  return "+" + d;
}

// 密码安全随机验证码（不用 Math.random）
export function genCode(len = 6): string {
  const min = 10 ** (len - 1);
  const max = 10 ** len;
  return String(randomInt(min, max));
}

export function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

// 恒定时间比对
export function hmacEqual(value: string, secret: string, expectedHex: string): boolean {
  const a = Buffer.from(hmac(value, secret), "hex");
  const b = Buffer.from(expectedHex || "", "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function uid(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}
