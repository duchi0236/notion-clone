// 端到端冒烟测试：node/tsx 直接跑，不依赖服务器/DB。
// 验证：密码注册/登录、手机验证码登录、账号归并、防接管(未验证拒绝)、微信票据兑换、JWT/JWKS 验签。
import { createAuthCore, AuthError } from "../src/index";
import { hmac } from "../src/util";
import { createMemoryStore, bcryptHasher, createMemoryRateLimiter, createMockSms, createMockWechat, allowCaptcha } from "../src/memory-store";

const OTP_SECRET = "test-otp-secret";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name); }
}
async function expectThrow(name: string, fn: () => Promise<unknown>, code?: string) {
  try {
    await fn();
    fail++; console.log("  ✗ " + name + "（应抛错却通过）");
  } catch (e) {
    const c = e instanceof AuthError ? e.code : "?";
    if (!code || c === code) { pass++; console.log(`  ✓ ${name}（${c}）`); }
    else { fail++; console.log(`  ✗ ${name}（期望 ${code} 实得 ${c}）`); }
  }
}

async function main() {
  const smsSink: { lastPhone?: string; lastCode?: string } = {};
  const store = createMemoryStore();
  const core = await createAuthCore({
    store,
    hasher: bcryptHasher,
    rateLimiter: createMemoryRateLimiter(),
    sms: createMockSms(smsSink),
    wechat: createMockWechat({ openid: "ox_123", unionid: "un_abc", name: "微信用户" }),
    captcha: allowCaptcha,
    otpSecret: OTP_SECRET,
    jwt: { issuer: "clawnote-auth", audience: "clawnote", ttlSec: 3600 },
  });

  console.log("【密码】");
  const reg = await core.password.register({ email: "Alice@X.com", password: "supersecret123", name: "Alice" });
  ok("注册返回 token", !!reg.accessToken && reg.user.email === "alice@x.com");
  const login = await core.password.login({ email: "alice@x.com", password: "supersecret123" });
  ok("登录同一用户", login.user.id === reg.user.id);
  await expectThrow("错误密码被拒", () => core.password.login({ email: "alice@x.com", password: "wrongwrong123" }), "INVALID_CREDENTIALS");
  await expectThrow("不存在用户同样文案", () => core.password.login({ email: "nobody@x.com", password: "whatever123" }), "INVALID_CREDENTIALS");
  await expectThrow("弱密码拒绝", () => core.password.register({ email: "b@x.com", password: "short" }), "WEAK_PASSWORD");
  await expectThrow("重复注册拒绝", () => core.password.register({ email: "alice@x.com", password: "anotherpass123" }), "IDENTITY_TAKEN");

  console.log("【JWT / JWKS】");
  const claims = await core.verify(reg.accessToken);
  ok("验签得到 sub", claims.sub === reg.user.id);
  const jwks = await core.jwks();
  ok("JWKS 暴露公钥", Array.isArray(jwks.keys) && jwks.keys.length === 1);
  await expectThrow("篡改 token 验签失败", () => core.verify(reg.accessToken + "x"));

  console.log("【手机验证码】");
  await core.phone.sendOtp({ phone: "13800138000", ip: "1.2.3.4" });
  ok("短信发出且拿到码", !!smsSink.lastCode && smsSink.lastPhone === "+8613800138000");
  await expectThrow("60s 内重复发码被限流", () => core.phone.sendOtp({ phone: "13800138000", ip: "1.2.3.4" }), "RATE_LIMITED");
  await expectThrow("错码被拒", () => core.phone.login({ phone: "13800138000", code: "000000" }), "OTP_INVALID");
  const phoneLogin = await core.phone.login({ phone: "13800138000", code: smsSink.lastCode! });
  ok("验证码登录建号", !!phoneLogin.accessToken && phoneLogin.user.phone === "+8613800138000");
  await expectThrow("验证码一次性（已消费）", () => core.phone.login({ phone: "13800138000", code: smsSink.lastCode! }), "OTP_INVALID");

  console.log("【账号归并：同手机号复用同一 User】");
  // 直接植入一条 OTP（绕过 60s 发码限流，仅为验证登录归并路径）
  await store.saveOtp({ phone: "+8613800138000", purpose: "LOGIN", codeHash: hmac("654321", OTP_SECRET), expiresAt: Date.now() + 60000, attempts: 0, consumedAt: null });
  const phoneLogin2 = await core.phone.login({ phone: "13800138000", code: "654321" });
  ok("同手机号 → 同 User", phoneLogin2.user.id === phoneLogin.user.id);

  console.log("【微信扫码：state → callback → ticket → exchange】");
  const start = await core.wechat.start();
  ok("生成 state + authUrl", !!start.state && start.authUrl.includes(start.state));
  const cb = await core.wechat.callback({ code: "wxcode", state: start.state });
  ok("回调产出 ticket", !!cb.ticket);
  const poll = await core.wechat.poll(start.state);
  ok("轮询 CONFIRMED", poll.status === "CONFIRMED" && poll.ticket === cb.ticket);
  const wx = await core.wechat.exchange(cb.ticket);
  ok("票据兑换得到 token", !!wx.accessToken && !!wx.user.id);
  await expectThrow("票据一次性（不可重放）", () => core.wechat.exchange(cb.ticket), "TICKET_INVALID");
  await expectThrow("错误 state 回调被拒", () => core.wechat.callback({ code: "x", state: "bogus" }), "STATE_INVALID");
  const parallel = await core.wechat.start();
  const callbacks = await Promise.allSettled([
    core.wechat.callback({ code: "wxcode", state: parallel.state }),
    core.wechat.callback({ code: "wxcode", state: parallel.state }),
  ]);
  const confirmations = callbacks.filter((result) => result.status === "fulfilled");
  ok("并发回调只能确认一次", confirmations.length === 1);
  if (confirmations.length === 1 && confirmations[0].status === "fulfilled") {
    const { ticket } = confirmations[0].value;
    const exchanges = await Promise.allSettled([core.wechat.exchange(ticket), core.wechat.exchange(ticket)]);
    ok("并发兑换只能登录一次", exchanges.filter((result) => result.status === "fulfilled").length === 1);
  }
  const binding = await core.wechat.start();
  const bound = await core.wechat.callback({ code: "wxcode", state: binding.state, currentUserId: wx.user.id });
  await expectThrow("绑定微信不产生登录票据", () => core.wechat.exchange(bound.ticket), "TICKET_INVALID");
  const otherBinding = await core.wechat.start();
  await expectThrow("禁止把已绑定的微信转到另一个账号",
    () => core.wechat.callback({ code: "wxcode", state: otherBinding.state, currentUserId: phoneLogin.user.id }), "IDENTITY_TAKEN");

  console.log("【防接管：未验证凭证不得归并】");
  const { linkOrCreateUser } = await import("../src/identity");
  await expectThrow("verified=false 直接拒绝", () => linkOrCreateUser(createMemoryStore(), { provider: "PHONE", providerAccountId: "+8613800138000", verified: false }), "UNVERIFIED_CREDENTIAL");

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("测试异常：", e);
  process.exit(1);
});
