import { NextRequest, NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";
import { readWechatFlow, wechatCookieNames, wechatLoginMode } from "@/lib/wechat-web";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const secure = wechatLoginMode() === "website";
  const flow = readWechatFlow(req.cookies.get(wechatCookieNames(secure).flow)?.value);
  const headers = { "Cache-Control": "no-store" };
  if (!state || flow?.state !== state) return NextResponse.json({ status: "EXPIRED" }, { headers });
  const core = await getAuthCore();
  const { status } = await core.wechat.poll(state);
  return NextResponse.json({ status }, { headers });
}
