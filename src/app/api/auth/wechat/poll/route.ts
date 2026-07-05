import { NextRequest, NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";

export const runtime = "nodejs";

// 前端轮询扫码状态；CONFIRMED 后拿 ticket 去 signIn('wechat')
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const core = await getAuthCore();
  const r = await core.wechat.poll(state);
  return NextResponse.json(r);
}
