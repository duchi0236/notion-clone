import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthCore } from "@/lib/auth-core";
import { wechatCookieNames, wechatCookieOptions, wechatLoginMode, wechatReturnPath } from "@/lib/wechat-web";
import { AuthError } from "../../../../../../packages/auth-core/src/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const mode = wechatLoginMode();
  return mode === "disabled"
    ? NextResponse.json({ error: "微信登录未配置", code: "PROVIDER_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ mode }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const mode = wechatLoginMode();
  if (mode === "disabled") return GET();
  try {
    const body = await req.json().catch(() => ({}));
    const bind = body?.bind === true;
    const userId = bind ? (await getServerSession(authOptions))?.user?.id : undefined;
    if (bind && !userId) return NextResponse.json({ error: "请先登录 ClawNote 再绑定微信" }, { status: 401 });
    const core = await getAuthCore();
    const { state, authUrl } = await core.wechat.start();
    const res = NextResponse.json({ authUrl }, { headers: { "Cache-Control": "no-store" } });
    const secure = mode === "website";
    const names = wechatCookieNames(secure);
    const options = wechatCookieOptions(secure);
    res.cookies.set(names.flow, JSON.stringify({ state, next: wechatReturnPath(body?.next), userId }), { ...options, maxAge: 300 });
    res.cookies.set(names.ticket, "", { ...options, maxAge: 0 });
    return res;
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
