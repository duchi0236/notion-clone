// @clawnote/auth-core 入口：createAuthCore(deps) 返回统一的认证 API。
// 三种 Provider（password / phone / wechat）全部收敛到 linkOrCreateUser → 签发 JWT。
import { createJwtService, type JwtService } from "./jwt";
import { linkOrCreateUser, validatePassword } from "./identity";
import { genCode, hmac, hmacEqual, normalizePhone, randomToken } from "./util";
import {
  AuthError,
  type AuthClaims,
  type AuthStore,
  type AuthUser,
  type Captcha,
  type Hasher,
  type JwtConfig,
  type RateLimiter,
  type SmsSender,
  type WechatClient,
} from "./types";

export * from "./types";
export { createJwtService } from "./jwt";
export { linkOrCreateUser, validatePassword } from "./identity";
export { normalizePhone } from "./util";

export interface AuthCoreDeps {
  store: AuthStore;
  hasher: Hasher;
  jwt: JwtConfig;
  otpSecret: string;
  sms?: SmsSender;
  wechat?: WechatClient;
  captcha?: Captcha;
  rateLimiter?: RateLimiter;
  defaultCountry?: string;
  otpTtlSec?: number;
  ticketTtlSec?: number;
}

export interface AuthCore {
  jwt: JwtService;
  signFor(user: AuthUser): Promise<string>;
  verify(token: string): Promise<AuthClaims>;
  jwks(): Promise<{ keys: unknown[] }>;
  password: {
    register(input: { email: string; password: string; name?: string }): Promise<{ user: AuthUser; accessToken: string }>;
    login(input: { email: string; password: string }): Promise<{ user: AuthUser; accessToken: string }>;
  };
  phone: {
    sendOtp(input: { phone: string; ip?: string; captchaToken?: string; purpose?: string }): Promise<{ sent: true }>;
    login(input: { phone: string; code: string; purpose?: string; currentUserId?: string }): Promise<{ user: AuthUser; accessToken: string }>;
  };
  wechat: {
    start(): Promise<{ state: string; authUrl: string }>;
    callback(input: { code: string; state: string; currentUserId?: string }): Promise<{ ticket: string }>;
    poll(state: string): Promise<{ status: string; ticket?: string }>;
    exchange(ticket: string): Promise<{ user: AuthUser; accessToken: string }>;
  };
}

export async function createAuthCore(deps: AuthCoreDeps): Promise<AuthCore> {
  const jwt = await createJwtService(deps.jwt);
  const country = deps.defaultCountry ?? "86";
  const otpTtl = (deps.otpTtlSec ?? 300) * 1000;
  const ticketTtl = (deps.ticketTtlSec ?? 60) * 1000;
  const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMy.MQ.fakefakefakefakefakefa"; // 防枚举的恒定耗时占位

  const signFor = (u: AuthUser) =>
    jwt.sign({ sub: u.id, tv: u.tokenVersion, email: u.email, phone: u.phone, name: u.name });

  // ---- 限流小工具（无 RateLimiter 注入时放行，仅 dev）----
  async function limit(checks: { key: string; limit: number; windowSec: number }[]) {
    if (!deps.rateLimiter) return;
    for (const c of checks) {
      const ok = await deps.rateLimiter.take(c.key, c.limit, c.windowSec);
      if (!ok) throw new AuthError("RATE_LIMITED", "操作过于频繁，请稍后再试", 429);
    }
  }

  return {
    jwt,
    signFor,
    verify: (t) => jwt.verify(t),
    jwks: () => jwt.jwks() as Promise<{ keys: unknown[] }>,

    password: {
      async register({ email, password, name }) {
        const e = email.trim().toLowerCase();
        validatePassword(password, { email: e });
        if (await deps.store.findIdentity("PASSWORD", e)) throw new AuthError("IDENTITY_TAKEN", "该邮箱已注册", 409);
        const secretHash = await deps.hasher.hash(password);
        const user = await linkOrCreateUser(deps.store, {
          provider: "PASSWORD",
          providerAccountId: e,
          verified: true,
          secretHash,
          profile: { name: name ?? null },
        });
        await deps.store.touchLogin(user.id);
        return { user, accessToken: await signFor(user) };
      },
      async login({ email, password }) {
        const e = email.trim().toLowerCase();
        const found = await deps.store.findIdentity("PASSWORD", e);
        // 用户不存在与密码错误返回同一文案 + 恒定耗时，防枚举/时序
        const ok = found
          ? await deps.hasher.compare(password, found.identity.secretHash ?? DUMMY_HASH)
          : (await deps.hasher.compare(password, DUMMY_HASH), false);
        if (!found || !ok) throw new AuthError("INVALID_CREDENTIALS", "邮箱或密码不正确", 401);
        await deps.store.touchLogin(found.user.id);
        return { user: found.user, accessToken: await signFor(found.user) };
      },
    },

    phone: {
      async sendOtp({ phone, ip, captchaToken, purpose = "LOGIN" }) {
        const p = normalizePhone(phone, country);
        if (deps.captcha) {
          const pass = await deps.captcha.verify(captchaToken ?? "", ip);
          if (!pass) throw new AuthError("CAPTCHA_FAILED", "人机验证未通过");
        }
        await limit([
          { key: `otp:phone:${p}:60s`, limit: 1, windowSec: 60 },
          { key: `otp:phone:${p}:1h`, limit: 5, windowSec: 3600 },
          { key: `otp:phone:${p}:1d`, limit: 10, windowSec: 86400 },
          ...(ip ? [{ key: `otp:ip:${ip}:1h`, limit: 20, windowSec: 3600 }] : []),
          { key: "otp:global:10s", limit: 100, windowSec: 10 },
        ]);
        const code = genCode(6);
        await deps.store.saveOtp({ phone: p, purpose, codeHash: hmac(code, deps.otpSecret), expiresAt: Date.now() + otpTtl, attempts: 0, consumedAt: null });
        if (!deps.sms) throw new AuthError("RATE_LIMITED", "短信服务未配置", 500);
        await deps.sms.send(p, code);
        return { sent: true };
      },
      async login({ phone, code, purpose = "LOGIN", currentUserId }) {
        const p = normalizePhone(phone, country);
        const rec = await deps.store.latestOtp(p, purpose);
        if (!rec || rec.consumedAt) throw new AuthError("OTP_INVALID", "验证码无效");
        if (rec.expiresAt < Date.now()) throw new AuthError("OTP_EXPIRED", "验证码已过期");
        if (rec.attempts >= 5) {
          await deps.store.consumeOtp(rec.id);
          throw new AuthError("OTP_INVALID", "尝试次数过多，请重新获取");
        }
        if (!hmacEqual(code, deps.otpSecret, rec.codeHash)) {
          await deps.store.incOtpAttempts(rec.id);
          throw new AuthError("OTP_INVALID", "验证码不正确");
        }
        await deps.store.consumeOtp(rec.id);
        const user = await linkOrCreateUser(deps.store, { provider: "PHONE", providerAccountId: p, verified: true, profile: { phone: p }, currentUserId });
        await deps.store.touchLogin(user.id);
        return { user, accessToken: await signFor(user) };
      },
    },

    wechat: {
      async start() {
        if (!deps.wechat) throw new AuthError("TICKET_INVALID", "微信登录未配置", 500);
        const state = randomToken(18);
        const ticket = randomToken(24);
        await deps.store.saveTicket({ ticket, state, status: "PENDING", expiresAt: Date.now() + 5 * 60 * 1000, consumedAt: null });
        return { state, authUrl: deps.wechat.authUrl(state) };
      },
      async callback({ code, state, currentUserId }) {
        if (!deps.wechat) throw new AuthError("TICKET_INVALID", "微信登录未配置", 500);
        const rec = await deps.store.getTicketByState(state);
        if (!rec || rec.status !== "PENDING" || rec.expiresAt < Date.now()) throw new AuthError("STATE_INVALID", "微信登录会话无效或已过期");
        const profile = await deps.wechat.exchangeCode(code);
        // 优先 unionid 归并；无 unionid 时用 openid 仅新建独立账号（不复用既有 unionid 账号）
        const accountId = profile.unionid || profile.openid;
        const user = await linkOrCreateUser(deps.store, {
          provider: "WECHAT",
          providerAccountId: accountId,
          verified: true,
          unionid: profile.unionid ?? null,
          openid: profile.openid,
          profile: { name: profile.name ?? null, avatarUrl: profile.avatar ?? null },
          currentUserId,
        });
        await deps.store.updateTicketByState(state, { status: "CONFIRMED", userId: user.id, unionid: profile.unionid ?? null, openid: profile.openid });
        await deps.store.touchLogin(user.id);
        return { ticket: rec.ticket };
      },
      async poll(state) {
        const rec = await deps.store.getTicketByState(state);
        if (!rec) return { status: "EXPIRED" };
        return { status: rec.status, ticket: rec.status === "CONFIRMED" && !rec.consumedAt ? rec.ticket : undefined };
      },
      async exchange(ticket) {
        const rec = await deps.store.getTicket(ticket);
        if (!rec || rec.status !== "CONFIRMED" || rec.consumedAt || rec.expiresAt < Date.now()) throw new AuthError("TICKET_INVALID", "登录票据无效");
        await deps.store.consumeTicket(ticket);
        const user = rec.userId ? await deps.store.findUserById(rec.userId) : null;
        if (!user) throw new AuthError("TICKET_INVALID", "用户不存在");
        return { user, accessToken: await signFor(user) };
      },
    },
  };
}
