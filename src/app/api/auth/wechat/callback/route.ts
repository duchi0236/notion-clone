import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthCore } from "@/lib/auth-core";
import { prismaAuthStore } from "@/lib/auth-store";
import { readWechatFlow, wechatCookieNames, wechatCookieOptions, wechatLoginMode, wechatReturnPath, wechatWebConfig } from "@/lib/wechat-web";
import { AuthError } from "../../../../../../packages/auth-core/src/index";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mode = wechatLoginMode();
  if (mode === "disabled") return NextResponse.json({ error: "微信登录未配置" }, { status: 503 });
  const origin = wechatWebConfig()?.origin ?? req.nextUrl.origin;
  const secure = mode === "website";
  const names = wechatCookieNames(secure);
  const options = wechatCookieOptions(secure);
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const flow = readWechatFlow(req.cookies.get(names.flow)?.value);
  const valid = Boolean(state && flow?.state === state);
  const next = wechatReturnPath(valid ? flow?.next : null);
  const target = new URL(valid && flow?.userId ? "/account" : "/login", origin);
  if (target.pathname === "/login") target.searchParams.set("callbackUrl", next);

  function finish(result: string, ticket?: string) {
    target.searchParams.set("wechat", result);
    const res = NextResponse.redirect(target);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    if (valid) res.cookies.set(names.flow, "", { ...options, maxAge: 0 });
    if (ticket) res.cookies.set(names.ticket, ticket, { ...options, maxAge: 60 });
    return res;
  }

  if (!valid || !code || code.length > 512) return finish("error");
  try {
    if (flow?.userId) {
      const session = await getServerSession(authOptions);
      const user = session?.user?.id === flow.userId ? await prismaAuthStore.findUserById(flow.userId) : null;
      if (!user || user.tokenVersion !== (session?.user as { tv?: number } | undefined)?.tv) return finish("error");
    }
    const core = await getAuthCore();
    const { ticket } = await core.wechat.callback({ code, state, currentUserId: flow?.userId });
    return flow?.userId ? finish("linked") : finish("confirmed", ticket);
  } catch (e) {
    return finish(e instanceof AuthError && e.code === "IDENTITY_TAKEN" ? "taken" : "error");
  }
}
