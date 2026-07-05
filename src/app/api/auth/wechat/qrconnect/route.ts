import { NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";

export const runtime = "nodejs";

// 发起微信扫码：返回 state + 授权 URL（前端据此展二维码，再轮询 /poll）
export async function GET() {
  const core = await getAuthCore();
  const { state, authUrl } = await core.wechat.start();
  return NextResponse.json({ state, authUrl });
}
