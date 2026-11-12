import assert from "node:assert/strict";
import { test } from "node:test";
import { createWechatWebClient, readWechatTicket, wechatReturnPath, wechatWebConfig } from "./wechat-web";

const config = { appId: "test-app", appSecret: "test-secret", origin: "https://clawnote.ink" };

test("builds the website authorization URL without exposing the app secret", () => {
  const url = new URL(createWechatWebClient(config).authUrl("test-state"));
  assert.equal(url.origin + url.pathname, "https://open.weixin.qq.com/connect/qrconnect");
  assert.equal(url.searchParams.get("appid"), config.appId);
  assert.equal(url.searchParams.get("scope"), "snsapi_login");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "test-state");
  assert.equal(url.searchParams.get("redirect_uri"), "https://clawnote.ink/api/auth/wechat/callback");
  assert.equal(url.hash, "#wechat_redirect");
  assert.ok(!url.href.includes(config.appSecret));
  assert.equal(wechatWebConfig({ WECHAT_APP_ID: config.appId, NEXTAUTH_URL: config.origin }), null);
  assert.equal(wechatWebConfig({ WECHAT_APP_ID: config.appId, WECHAT_APP_SECRET: config.appSecret, NEXTAUTH_URL: "http://clawnote.ink" }), null);
});

test("exchanges the code only at WeChat and keeps a stable website identity", async (t) => {
  let data: Record<string, unknown> = { openid: "test-open-id", access_token: "fake-access-token" };
  t.mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    assert.equal(url.origin + url.pathname, "https://api.weixin.qq.com/sns/oauth2/access_token");
    assert.equal(url.searchParams.get("secret"), config.appSecret);
    assert.equal(url.searchParams.get("code"), "test-code");
    assert.equal(options.redirect, "error");
    return Response.json(data);
  });
  const provider = createWechatWebClient(config);
  const first = await provider.exchangeCode("test-code");
  data = { ...data, unionid: "test-union-id" };
  const again = await provider.exchangeCode("test-code");
  assert.equal(first.accountId, "website:test-app:test-open-id");
  assert.equal(first.accountId, again.accountId);
  assert.equal(again.unionid, "test-union-id");
  assert.ok(!("access_token" in again));
  data = { errcode: 40029, errmsg: config.appSecret };
  await assert.rejects(provider.exchangeCode("test-code"), (error: unknown) =>
    error instanceof Error && !error.message.includes(config.appSecret) && /微信授权服务/.test(error.message));
});

test("restricts redirect destinations and production ticket cookie names", () => {
  assert.equal(wechatReturnPath("/clawnote?doc=123"), "/clawnote?doc=123");
  for (const target of ["https://other.invalid", "//other.invalid", "/\\other.invalid", "/\n/other.invalid"]) {
    assert.equal(wechatReturnPath(target), "/clawnote");
  }
  const ticket = "a".repeat(32);
  assert.equal(readWechatTicket("clawnote.wechat.ticket=" + ticket, true), "");
  assert.equal(readWechatTicket("__Host-clawnote.wechat.ticket=" + ticket, true), ticket);
});
