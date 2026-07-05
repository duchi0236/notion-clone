import { NextRequest, NextResponse } from "next/server";
import { getAuthCore, peekDevCode } from "@/lib/auth-core";
import { AuthError, normalizePhone } from "../../../../../../packages/auth-core/src/index";

export const runtime = "nodejs";

// 发送手机验证码。生产需先过人机验证 + Redis 限流；dev 下回显验证码便于本地体验。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone ?? "");
  const captchaToken = body.captchaToken ? String(body.captchaToken) : undefined;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;

  try {
    const core = await getAuthCore();
    await core.phone.sendOtp({ phone, ip, captchaToken });
    const res: Record<string, unknown> = { sent: true };
    const dev = peekDevCode(normalizePhone(phone));
    if (dev) res.devCode = dev; // 仅开发期：方便本地无短信网关时登录
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
