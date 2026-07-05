import { NextRequest, NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";
import { AuthError } from "../../../../../packages/auth-core/src/index";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = body.name ? String(body.name) : undefined;

  try {
    const core = await getAuthCore();
    const { user } = await core.password.register({ email, password, name });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
