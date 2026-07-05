import { NextRequest, NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";
import { AuthError } from "../../../../../../packages/auth-core/src/index";

export const runtime = "nodejs";

// 微信回调：code+state → 服务端换 unionid → 归并/建号 → 确认 ticket。
// 真机流程为 302 回前端；这里返回 JSON 便于本地链路验证。
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  try {
    const core = await getAuthCore();
    const { ticket } = await core.wechat.callback({ code, state });
    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    return NextResponse.json({ error: "微信登录失败" }, { status: 500 });
  }
}
