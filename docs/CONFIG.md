# ClawNote 配置总表（单一信息源）

> 这是上线/联调前**唯一需要看的配置清单**。所有 env、外部账号、资质、密钥、SSO 客户端注册都收在这里。
> 配套文件：[`.env.production.example`](../.env.production.example)（可直接复制成 `.env.production` 填写）、
> [`docs/PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md)（上线动作清单）。

---

## 0. 名词与现状速览

ClawNote = Web(Next.js) + 桌面(Electron) + 移动(Expo WebView) + 自有登录 PaaS（`packages/auth-core`，对外提供 **OIDC/JWKS SSO**）。

**登录链路现状（重要，决定你要配什么）**：

| 能力 | 代码是否已接线 | 当前实现 | 上生产要做什么 |
|---|---|---|---|
| 邮箱+密码登录 | ✅ 已接线 | bcrypt + Prisma，真实可用 | 配 `DATABASE_URL` 即可 |
| 手机验证码登录 | ⚠️ 链路通、**短信是 mock** | 验证码打到服务端日志/dev 回显 | 接真实短信网关（见 §D），改 `auth-core.ts` 一行 |
| 微信扫码登录 | ⚠️ 链路通、**微信是 mock** | 固定假身份，本地可跑通流程 | 接微信开放平台（见 §E），改 `auth-core.ts` 一行 |
| 防刷限流 | ⚠️ **内存限流** | 单进程内存，多实例不共享 | 接 Redis（见 §G） |
| 人机验证(captcha) | ⚠️ **放行** | 始终通过 | 接 Turnstile（见 §F） |
| **SSO（OIDC/JWKS）** | ✅ **已接线并端到端验证通过** | RS256 + JWKS，第三方凭公钥独立验签 | 配稳定密钥 + `OIDC_CLIENTS`（见 §B/§C） |

> 「mock」不是 bug，是**适配器没换**。`src/lib/auth-core.ts` 里把 `sms`/`wechat`/`rateLimiter` 三个适配器从 dev 版替换成真实版即可，**上层业务零改动**。

---

## A. 核心运行（必填）

| 变量 | 说明 | 生成/示例 |
|---|---|---|
| `NODE_ENV` | 生产固定 `production` | `production` |
| `DATABASE_URL` | PostgreSQL（需 `pgvector` 扩展） | `postgresql://claw:PWD@postgres:5432/clawnote` |
| `NEXTAUTH_URL` | **对外公开的登录服务地址**，OIDC 发现文档的端点 URL 由它生成 | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | NextAuth 会话签名密钥 | `openssl rand -base64 32` |
| `APP_ENV` | 业务环境标记（移动端/灰度用） | `production` |

> ⚠️ `NEXTAUTH_URL` 必须是第三方能访问到的**最终公网地址**，否则 `/.well-known/openid-configuration` 里给出的 authorize/token/jwks 端点会指错。

---

## B. 登录核心 auth-core（必填）

| 变量 | 说明 | 生成 |
|---|---|---|
| `OTP_SECRET` | 验证码 HMAC 密钥 | `openssl rand -base64 32` |
| `AUTH_JWT_PRIVATE_KEY` | RS256 私钥（PKCS#8 PEM，**签发** access/id_token） | 见下 |
| `AUTH_JWT_PUBLIC_KEY` | RS256 公钥（SPKI PEM，**JWKS 对外公开**） | 见下 |

生成密钥对：
```bash
openssl genpkey -algorithm RSA -out priv.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in priv.pem -pubout -out pub.pem
# 写入 env 时保留换行（用 \n 或多行变量）
AUTH_JWT_PRIVATE_KEY="$(cat priv.pem)"
AUTH_JWT_PUBLIC_KEY="$(cat pub.pem)"
```

> ⚠️ **生产必须显式配置密钥**。不配则 dev 下会落盘到 gitignore 的 `.auth-dev-keys/`（仅本地、跨重启稳定）；生产环境不配会导致无法签发——这是刻意的硬约束（见 `src/lib/dev-keys.ts`）。
> 🔁 **轮换密钥**会使所有已签发 token 失效，需重新登录；JWKS 支持多 key 时可平滑轮换（当前单 key）。

---

## C. SSO（OIDC / 单点登录）— 本轮新增，已验证 ✅

第三方应用通过标准 OIDC 授权码流程接入 ClawNote 登录。**端点**（`{ISS}` = `NEXTAUTH_URL`）：

| 端点 | 路径 |
|---|---|
| 发现文档 | `{ISS}/.well-known/openid-configuration` |
| 公钥集 JWKS | `{ISS}/.well-known/jwks.json` |
| 授权 | `{ISS}/api/auth/oidc/authorize` |
| 令牌 | `{ISS}/api/auth/oidc/token` |
| 用户信息 | `{ISS}/api/auth/oidc/userinfo` |

固定参数：`issuer = clawnote-auth`，`alg = RS256`，`response_type = code`，支持 `PKCE(S256)`，`scope = openid profile email phone`。

**注册第三方应用** —— 配 `OIDC_CLIENTS`（JSON 字符串）：
```json
OIDC_CLIENTS=[
  {
    "clientId": "your-app",
    "clientSecret": "用 openssl rand -hex 24 生成",
    "redirectUris": ["https://app.example.com/auth/callback"],
    "name": "Your App"
  }
]
```
- `clientSecret` 省略 = 公共客户端，**强制走 PKCE**。
- `redirectUris` 必须**精确匹配**（含路径），不做前缀匹配。
- 生产**不配 `OIDC_CLIENTS` 则没有任何客户端**；dev 下内置 `demo-client`/`demo-secret`（仅 `NODE_ENV!=production`）。

**已验证的行为**（e2e 通过）：授权码一次性（重放→`invalid_grant`）、错误 secret→`401 invalid_client`、未登录→跳 `/login?callbackUrl=...`、id_token 含 `sub/aud/iss/email`、第三方仅凭 JWKS 公钥即可独立验签 access_token。

---

## D. 短信验证码 SMS（手机登录要用）— ⚠️ 占位待接线

| 变量 | 说明 |
|---|---|
| `SMS_PROVIDER` | `aliyun` / `tencent` |
| `SMS_ACCESS_KEY_ID` / `SMS_ACCESS_KEY_SECRET` | 云厂商 AccessKey |
| `SMS_SIGN_NAME` | 短信签名（需报备） |
| `SMS_TEMPLATE_CODE` | 验证码模板 ID（需报备） |
| `SMS_SDK_APP_ID` | 腾讯云需要 |

**接线步骤**：在 `src/lib/auth-core.ts` 把 `sms: devSms` 换成读取上述 env 的真实 `SmsSender`（实现 `send(phone, code)`）。**未替换前，填了 env 也不生效。**

> 需要：云厂商账号 + 实名 + 短信签名/模板审核（1–3 工作日）。

---

## E. 微信扫码登录 WeChat（要用）— ⚠️ 占位待接线

| 变量 | 说明 |
|---|---|
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 开放平台「网站应用」凭证 |
| `WECHAT_REDIRECT_URI` | `https://your-domain.com/api/auth/wechat/callback` |

**接线步骤**：`src/lib/auth-core.ts` 把 `wechat: devWechat` 换成真实 `WechatClient`（`authUrl` + `exchangeCode`）。

> 需要：**微信开放平台账号，认证费 300 元/年**；网站应用审核；回调域名需备案。

---

## F. 人机验证 Captcha — ⚠️ 当前始终放行

| 变量 | 说明 |
|---|---|
| `CAPTCHA_PROVIDER` | 如 `turnstile` |
| `TURNSTILE_SECRET` | Cloudflare Turnstile 密钥 |

接线：把 auth-core 的 `captcha` 适配器从 `allowCaptcha` 换成真实校验，并在登录页加前端组件。

---

## G. 限流 Redis — ⚠️ 当前内存（多实例不共享）

| 变量 | 说明 |
|---|---|
| `REDIS_URL` | `redis://redis:6379` |

多副本/水平扩展时**必须**换 Redis 限流，否则防刷失效。接线：`createMemoryRateLimiter()` → Redis 版 `RateLimiter`。

---

## H. AI 模型能力

- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`：env 兜底；
- **推荐在产品内「AI 控制台」配置**（存 DB `AiConfig`，每能力可独立设 provider/model/baseUrl/apiKey），覆盖 env。
- `AGENT_URL` / `CLAWNOTE_AGENT_TOKEN`：内生 Agent 服务地址与鉴权 token（`openssl rand -hex 32`）。

---

## I. 媒体生成（文生图/视频）

| 变量 | 说明 |
|---|---|
| `MEDIA_PROVIDER` | 可灵/即梦/Runway/Pika… |
| `MEDIA_API_KEY` | env 兜底；控制台「媒体生成」可按能力覆盖 |

当前 `src/lib/media-gen.ts` 为占位（返回结构化结果），接真实供应商时填入 HTTP 调用即可。

---

## J. 文件上传 / 存储

| 变量 | 说明 | 默认 |
|---|---|---|
| `UPLOAD_DIR` | 本地落盘目录 | `public/uploads` |
| `MAX_UPLOAD_MB` | 单文件上限 | `50` |
| `ALLOWED_UPLOAD_TYPES` | 允许的 MIME（逗号分隔） | 见 example |
| `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` | 对象存储（生产推荐，替代本地盘） | 空 |

---

## K. 协作 / 画图（前端公开变量）

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_COLLAB` | 是否开启实时协作 |
| `NEXT_PUBLIC_COLLAB_WS` | 协作 WebSocket 地址 |
| `NEXT_PUBLIC_DRAWIO_URL` | drawio 嵌入地址（自托管时填） |

---

## L. 移动端（Expo）

- `EXPO_PUBLIC_SERVER_URL`：生产指向公网域名（`mobile/eas.json` 各 profile 已占位）。
- `mobile/app.config.js`：`bundleId = ai.clawnote.app`，生产关闭明文 HTTP。
- 提交凭证（`eas.json` 的 `submit`）：见 §外部账号。

---

## M. 桌面端（Electron 签名/公证）

`build/notarize.cjs` 按 env 门控，缺凭证则跳过（不阻断构建）。打正式包需：

| 平台 | 需要 |
|---|---|
| macOS | Apple Developer ID 证书、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`（公证） |
| Windows | 代码签名证书（EV/OV）|

`package.json > build` 已配 `appId=ai.clawnote.app`、hardenedRuntime、generic 更新源。

---

## 外部账号与资质（要花钱/走流程，提前办）

| 项目 | 费用 | 周期 | 用途 |
|---|---|---|---|
| 域名 + SSL 证书 | 视情况 | 即时~1天 | 全站 HTTPS（OIDC/微信回调强制） |
| Apple Developer | 99 USD/年 | 1–2 天 | iOS 上架 + 桌面公证 |
| Google Play 开发者 | 25 USD（一次性） | 1–2 天 | Android 上架 |
| **微信开放平台** | **300 元/年** | 审核数天 | 微信扫码登录（网站应用） |
| 短信服务（阿里云/腾讯云） | 按量 | 签名/模板审核 1–3 天 | 手机验证码 |
| 对象存储（S3/OSS/COS） | 按量 | 即时 | 生产文件存储 |
| Cloudflare Turnstile | 免费 | 即时 | 人机验证 |
| **ICP 备案**（中国大陆服务器/域名） | 免费 | **数天~数周** | 合规前置，最易卡上线 |
| **软件著作权（软著）** | 可免费/加急收费 | 30+ 天（加急更快） | 国内安卓应用商店上架常需 |
| PIPL/隐私合规 | — | — | 隐私政策、用户协议、数据出境评估 |

---

## 上线前最小配置清单（按此顺序）

1. **§A 核心** + **§B 密钥**（不配密钥无法签发，最易漏）。
2. PostgreSQL 起好、`pgvector` 装好、`prisma migrate deploy`。
3. 决定登录方式：只用邮箱密码 → 到此即可上线；要手机/微信 → 接 §D/§E 适配器。
4. 多副本部署 → 必接 **§G Redis**。
5. 要 SSO → 配 **§C `OIDC_CLIENTS`**。
6. 生产存储 → **§J S3**。
7. 域名 HTTPS + 反代（见 `deploy/nginx.conf`）。
8. 对照 [`docs/PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) 过一遍。

> 凡标 ⚠️ 的能力，**填 env 之外还需替换 `src/lib/auth-core.ts` 里的适配器**才会真正生效——这是当前「功能不全」的根因，已在上表逐项标注。
