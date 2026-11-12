// ClawNote 的 auth-core 单例。未配置微信开放平台时，仅在本地开发环境启用微信模拟。
import { createAuthCore, type AuthCore, type SmsSender, type WechatClient } from "../../packages/auth-core/src/index";
import { bcryptHasher, createMemoryRateLimiter } from "../../packages/auth-core/src/memory-store";
import { prismaAuthStore } from "@/lib/auth-store";
import { resolveJwtKeys } from "@/lib/dev-keys";
import { createRedisRateLimiter } from "@/lib/redis-rate-limiter";
import { createWechatWebClient, wechatCallbackPath, wechatLoginMode, wechatWebConfig } from "@/lib/wechat-web";

const isDev = process.env.NODE_ENV !== "production";

// 开发期短信：把验证码打到服务端日志，并暂存供 /otp/send 在 dev 下回显（便于本地体验）
const devCodes = new Map<string, string>();
const devSms: SmsSender = {
  async send(phone, code) {
    devCodes.set(phone, code);
    console.log(`[DEV SMS] ${phone} 验证码：${code}`);
  },
};
export function peekDevCode(phone: string): string | undefined {
  return isDev ? devCodes.get(phone) : undefined;
}

// 开发期微信：无 AppID 时用 mock（固定身份），便于本地跑通扫码链路
const devWechat: WechatClient = {
  authUrl: (state) => `${wechatCallbackPath}?code=devcode&state=${encodeURIComponent(state)}`,
  exchangeCode: async () => ({ openid: "dev_openid_devcode", unionid: "dev_union_devcode", name: "微信用户" }),
};

let _core: Promise<AuthCore> | null = null;
export function getAuthCore(): Promise<AuthCore> {
  if (!_core) {
    const wechatConfig = wechatWebConfig();
    _core = createAuthCore({
      store: prismaAuthStore,
      hasher: bcryptHasher,
      // REDIS_URL 配置时用 Redis 原子限流（多实例安全）,否则内存限流（仅单实例）
      rateLimiter: createRedisRateLimiter() ?? createMemoryRateLimiter(),
      sms: devSms, // 生产换阿里云/腾讯云
      wechat: wechatConfig ? createWechatWebClient(wechatConfig) : wechatLoginMode() === "mock" ? devWechat : undefined,
      otpSecret: process.env.OTP_SECRET || "dev-otp-secret-change-me",
      jwt: {
        issuer: "clawnote-auth",
        audience: "clawnote",
        ...resolveJwtKeys(), // 生产：env；dev：落盘的稳定密钥（保证 JWKS/签发/验签同一把钥）
      },
    });
  }
  return _core;
}
