// 内存实现：用于单测与本地 dev（生产用 Prisma 实现同一 AuthStore 接口）。
import bcrypt from "bcryptjs";
import { uid } from "./util";
import type {
  AuthIdentity,
  AuthProvider,
  AuthStore,
  AuthUser,
  Captcha,
  Hasher,
  OtpRecord,
  RateLimiter,
  SmsSender,
  WechatClient,
  WechatTicketRecord,
} from "./types";

export function createMemoryStore(): AuthStore {
  const users = new Map<string, AuthUser>();
  const identities: AuthIdentity[] = [];
  const otps: OtpRecord[] = [];
  const tickets: WechatTicketRecord[] = [];

  return {
    async findIdentity(provider, accountId) {
      const identity = identities.find((i) => i.provider === provider && i.providerAccountId === accountId);
      if (!identity) return null;
      const user = users.get(identity.userId);
      return user ? { identity, user } : null;
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async createUserWithIdentity({ user, identity }) {
      const id = uid("usr");
      const u: AuthUser = {
        id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl ?? null,
        tokenVersion: 0,
      };
      users.set(id, u);
      const idn: AuthIdentity = { id: uid("idn"), userId: id, ...identity };
      identities.push(idn);
      return { user: u, identity: idn };
    },
    async addIdentity(userId, identity) {
      const idn: AuthIdentity = { id: uid("idn"), userId, ...identity };
      identities.push(idn);
      return idn;
    },
    async bumpTokenVersion(userId) {
      const u = users.get(userId);
      if (u) u.tokenVersion += 1;
    },
    async touchLogin() {
      /* no-op in memory */
    },
    async saveOtp(rec) {
      const r: OtpRecord = { id: uid("otp"), ...rec };
      otps.push(r);
      return r;
    },
    async latestOtp(phone, purpose) {
      const list = otps.filter((o) => o.phone === phone && o.purpose === purpose);
      return list.length ? list[list.length - 1] : null;
    },
    async incOtpAttempts(id) {
      const o = otps.find((x) => x.id === id);
      if (o) o.attempts += 1;
    },
    async consumeOtp(id) {
      const o = otps.find((x) => x.id === id);
      if (o) o.consumedAt = Date.now();
    },
    async saveTicket(rec) {
      tickets.push({ ...rec });
    },
    async getTicketByState(state) {
      return tickets.find((t) => t.state === state) ?? null;
    },
    async getTicket(ticket) {
      return tickets.find((t) => t.ticket === ticket) ?? null;
    },
    async updateTicketByState(state, expected, patch) {
      const t = tickets.find((x) => x.state === state && x.status === expected &&
        (expected !== "PENDING" || x.expiresAt > Date.now()));
      if (!t) return false;
      Object.assign(t, patch);
      return true;
    },
    async consumeTicket(ticket) {
      const t = tickets.find((x) => x.ticket === ticket && x.status === "CONFIRMED" && !x.consumedAt && x.expiresAt > Date.now());
      if (!t) return false;
      t.consumedAt = Date.now();
      t.status = "CONSUMED";
      return true;
    },
  };
}

export const bcryptHasher: Hasher = {
  hash: (s) => bcrypt.hash(s, 10),
  compare: (s, h) => bcrypt.compare(s, h),
};

// 简单内存限流（窗口计数）；生产用 Redis INCR+EXPIRE 原子实现
export function createMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async take(key, limit, windowSec) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || b.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
        return true;
      }
      if (b.count >= limit) return false;
      b.count += 1;
      return true;
    },
  };
}

export function createMockSms(sink: { lastPhone?: string; lastCode?: string }): SmsSender {
  return {
    async send(phone, code) {
      sink.lastPhone = phone;
      sink.lastCode = code;
    },
  };
}

export function createMockWechat(profile: { openid: string; unionid?: string; name?: string; avatar?: string }): WechatClient {
  return {
    authUrl: (state) => `https://open.weixin.qq.com/connect/qrconnect?appid=MOCK&state=${state}&scope=snsapi_login`,
    exchangeCode: async () => ({ ...profile }),
  };
}

export const allowCaptcha: Captcha = { verify: async () => true };
