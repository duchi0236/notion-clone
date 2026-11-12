import { AuthError, type WechatClient } from "../../packages/auth-core/src/index";

export const wechatCallbackPath = "/api/auth/wechat/callback";

export type WechatFlow = { state: string; next: string; userId?: string };

export function wechatCookieNames(secure: boolean) {
  const prefix = secure ? "__Host-" : "";
  return { flow: `${prefix}clawnote.wechat.flow`, ticket: `${prefix}clawnote.wechat.ticket` };
}

export function readWechatFlow(value: string | undefined): WechatFlow | null {
  if (!value) return null;
  try {
    const flow = JSON.parse(value);
    if (typeof flow?.state !== "string" || typeof flow.next !== "string" ||
      (flow.userId !== undefined && typeof flow.userId !== "string")) return null;
    return flow;
  } catch {
    return null;
  }
}

export function readWechatTicket(cookieHeader: unknown, secure: boolean) {
  if (typeof cookieHeader !== "string") return "";
  const prefix = `${wechatCookieNames(secure).ticket}=`;
  const value = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
  return value && /^[A-Za-z0-9_-]{32}$/.test(value) ? value : "";
}

export function wechatWebConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const appId = env.WECHAT_APP_ID?.trim();
  const appSecret = env.WECHAT_APP_SECRET?.trim();
  if (!appId || !appSecret || !env.NEXTAUTH_URL) return null;
  try {
    const url = new URL(env.NEXTAUTH_URL);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { appId, appSecret, origin: url.origin };
  } catch {
    return null;
  }
}

export function wechatLoginMode() {
  if (wechatWebConfig()) return "website";
  return process.env.NODE_ENV === "development" ? "mock" : "disabled";
}

export function wechatReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value)) return "/clawnote";
  const root = "https://clawnote.invalid";
  try {
    const target = new URL(value, root);
    return target.origin === root ? target.pathname + target.search + target.hash : "/clawnote";
  } catch {
    return "/clawnote";
  }
}

export function wechatCookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
}

export function createWechatWebClient(config: NonNullable<ReturnType<typeof wechatWebConfig>>): WechatClient {
  const failure = () => new AuthError("PROVIDER_UNAVAILABLE", "微信授权服务暂不可用，请稍后重试", 502);
  return {
    authUrl(state) {
      const url = new URL("https://open.weixin.qq.com/connect/qrconnect");
      url.search = new URLSearchParams({
        appid: config.appId,
        redirect_uri: new URL(wechatCallbackPath, config.origin).href,
        response_type: "code",
        scope: "snsapi_login",
        state,
      }).toString();
      url.hash = "wechat_redirect";
      return url.href;
    },
    async exchangeCode(code) {
      const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
      url.search = new URLSearchParams({
        appid: config.appId,
        secret: config.appSecret,
        code,
        grant_type: "authorization_code",
      }).toString();
      try {
        const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw failure();
        const data = await response.json();
        if (!data || data.errcode || typeof data.access_token !== "string" || !data.access_token ||
          typeof data.openid !== "string" || !data.openid || data.openid.length > 191) throw failure();
        const unionid = typeof data.unionid === "string" && data.unionid.length <= 191 ? data.unionid : undefined;
        return { openid: data.openid, unionid, accountId: `website:${config.appId}:${data.openid}`, name: "微信用户" };
      } catch {
        // Do not log the upstream request URL. It contains the AppSecret.
        throw failure();
      }
    },
  };
}
