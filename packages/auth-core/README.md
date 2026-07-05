# @clawnote/auth-core

统一登录核心（**账号密码 / 手机验证码 / 微信**），封装为可复用包：身份归并 + JWT/JWKS 签发校验。
存储、短信、微信、限流、人机验证**全部依赖注入**——同一套核心，web / mobile / desktop 共用；客户端用 **JWKS 验签**，不直连身份库。

## 架构
```
某凭证(密码/验证码/微信code) ──► Provider(authorize 前置防刷/校验)
                                   └─► linkOrCreateUser(唯一归并点, 防接管)
                                         └─► 稳定 user.id ──► JWT(RS256, 私钥签)
客户端(web/mobile/desktop) ──► JWKS(公钥) 验签 ──► 拿 sub=user.id 映射自己的业务/工作区
```
- **自有库**：身份数据(User/AuthIdentity/PhoneOtp/WechatTicket/LoginAudit)在本包的独立 DB（`AUTH_DATABASE_URL`），见 `prisma/schema.prisma`。
- **JWT/JWKS**：RS256 非对称。Auth 端持私钥签发；任意客户端拉 JWKS 公钥本地验签，零信任耦合。

## 用法
```ts
import { createAuthCore } from "@clawnote/auth-core";

const auth = await createAuthCore({
  store,        // 实现 AuthStore（用 Prisma 接自有库，或 memory-store 做 dev/测试）
  hasher,       // bcryptHasher
  sms,          // 阿里云/腾讯云短信适配（实现 SmsSender）
  wechat,       // 微信开放平台适配（实现 WechatClient：authUrl + exchangeCode）
  captcha,      // Turnstile/天御（实现 Captcha.verify，服务端二次校验）
  rateLimiter,  // Redis INCR+EXPIRE（实现 RateLimiter.take）—— 生产必需
  otpSecret: process.env.OTP_SECRET!,
  jwt: { issuer: "clawnote-auth", audience: "clawnote", privateKeyPem, publicKeyPem },
});

// 三种登录全部返回 { user, accessToken }
await auth.password.register({ email, password, name });
await auth.password.login({ email, password });
await auth.phone.sendOtp({ phone, ip, captchaToken });
await auth.phone.login({ phone, code });
const { state, authUrl } = await auth.wechat.start();   // 前端展二维码
await auth.wechat.callback({ code, state });             // 微信回调
await auth.wechat.poll(state);                           // 前端轮询拿 ticket
await auth.wechat.exchange(ticket);                      // 兑换 token

// 客户端验签
const claims = await auth.verify(token);                 // { sub, tv, ... }
const jwks = await auth.jwks();                           // 暴露给 /.well-known/jwks.json
```

## 接入方式（按已选：Monorepo 共享包 + 自有库 + JWT/JWKS）
1. **Auth 端**（可在 ClawNote 的 `/api/auth/*` 路由内托管，或单独进程）：用 Prisma(自有库) 实现 `AuthStore`，挂上 `sendOtp/login/wechat/*` 路由 + `/.well-known/jwks.json`。
2. **ClawNote 业务端**：登录成功拿到 `accessToken` 写 cookie/Authorization；服务端用 `auth.verify()`（或本地缓存 JWKS）校验，取 `claims.sub` 作为用户身份，再映射到 workspace。**不再用 email 做身份真源、删除 demo 兜底**。
3. **mobile/desktop**：同样 import 本包的 `verify`/调用 Auth 端 REST，token 存安全存储。

## 安全要点（已内置 / 需宿主提供）
- 已内置：未验证凭证拒绝归并(防接管)、OTP HMAC 存储 + 一次性 + 5 次锁定、恒定耗时防枚举、票据/状态一次性短 TTL、密码强度校验、tokenVersion 全端登出位。
- 需宿主：Redis 原子限流（防 count() 竞态与号段轰炸）、captcha 服务端校验、强随机密钥(NEXTAUTH/OTP/SMS/WECHAT)、HTTPS、合规告知。

## 测试
```bash
npx tsx packages/auth-core/test/smoke.ts   # 22 项端到端（内存实现，无需 DB/服务器）
```
