// @clawnote/auth-core — 统一登录核心（账号密码 / 手机验证码 / 微信）。
// 与存储、短信、微信、限流、验证码全部解耦：宿主注入实现；本包只负责认证编排、
// 身份归并（防接管）与 JWT 签发/校验。web / mobile / desktop 共用本包。

export type AuthProvider = "PASSWORD" | "PHONE" | "WECHAT";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl?: string | null;
  tokenVersion: number;
}

export interface AuthIdentity {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerAccountId: string; // PASSWORD=email / PHONE=E.164 / WECHAT=unionid||openid
  secretHash?: string | null; // 仅 PASSWORD
  unionid?: string | null;
  openid?: string | null;
  isPrimary: boolean;
}

export interface OtpRecord {
  id: string;
  phone: string;
  codeHash: string; // HMAC，不存明文
  purpose: string;
  expiresAt: number; // epoch ms
  attempts: number;
  consumedAt: number | null;
}

export type WechatTicketStatus = "PENDING" | "CONFIRMED" | "CONSUMED";
export interface WechatTicketRecord {
  ticket: string; // 一次性短令牌（兑换 JWT 用）
  state: string; // 防 CSRF + 扫码轮询标识
  status: WechatTicketStatus;
  userId?: string | null;
  unionid?: string | null;
  openid?: string | null;
  expiresAt: number;
  consumedAt: number | null;
}

// ---- 注入接口（宿主用 Prisma / 内存等实现）-------------------------------
export interface AuthStore {
  findIdentity(provider: AuthProvider, providerAccountId: string): Promise<{ identity: AuthIdentity; user: AuthUser } | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createUserWithIdentity(input: { user: Partial<AuthUser>; identity: Omit<AuthIdentity, "id" | "userId"> }): Promise<{ user: AuthUser; identity: AuthIdentity }>;
  addIdentity(userId: string, identity: Omit<AuthIdentity, "id" | "userId">): Promise<AuthIdentity>;
  bumpTokenVersion(userId: string): Promise<void>;
  touchLogin(userId: string): Promise<void>;
  // OTP
  saveOtp(rec: Omit<OtpRecord, "id">): Promise<OtpRecord>;
  latestOtp(phone: string, purpose: string): Promise<OtpRecord | null>;
  incOtpAttempts(id: string): Promise<void>;
  consumeOtp(id: string): Promise<void>;
  // WeChat ticket
  saveTicket(rec: WechatTicketRecord): Promise<void>;
  getTicketByState(state: string): Promise<WechatTicketRecord | null>;
  getTicket(ticket: string): Promise<WechatTicketRecord | null>;
  updateTicketByState(state: string, patch: Partial<WechatTicketRecord>): Promise<void>;
  consumeTicket(ticket: string): Promise<void>;
}

export interface SmsSender {
  send(phone: string, code: string): Promise<void>;
}

export interface Captcha {
  // 服务端二次校验人机验证 token；与 ip 绑定、一次性
  verify(token: string, ip?: string): Promise<boolean>;
}

export interface RateLimiter {
  // 原子计数：在 windowSec 内 key 是否仍允许（true=放行）。Redis INCR+EXPIRE 实现，避免 count() 竞态
  take(key: string, limit: number, windowSec: number): Promise<boolean>;
}

export interface WechatClient {
  authUrl(state: string): string;
  exchangeCode(code: string): Promise<{ openid: string; unionid?: string; name?: string; avatar?: string }>;
}

export interface Hasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface JwtConfig {
  issuer: string;
  audience?: string;
  ttlSec?: number; // 默认 7d
  kid?: string;
  privateKeyPem?: string; // PKCS8；缺省则启动时临时生成（仅 dev）
  publicKeyPem?: string; // SPKI
}

export interface AuthClaims {
  sub: string; // user.id（身份真源）
  tv: number; // tokenVersion（改密/解绑后全端登出）
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}

export type AuthErrorCode =
  | "UNVERIFIED_CREDENTIAL"
  | "IDENTITY_TAKEN"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "CAPTCHA_FAILED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "TICKET_INVALID"
  | "WEAK_PASSWORD"
  | "STATE_INVALID";

export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;
  constructor(code: AuthErrorCode, message?: string, status = 400) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}
