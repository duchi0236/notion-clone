import { NextRequest, NextResponse } from "next/server";
import { getAuthCore } from "@/lib/auth-core";
import { prismaAuthStore } from "@/lib/auth-store";

export const runtime = "nodejs";

// OIDC userinfo：Bearer access_token → 用户资料
export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  try {
    const core = await getAuthCore();
    const claims = await core.verify(token);
    const user = await prismaAuthStore.findUserById(claims.sub);
    if (!user) throw new Error("no user");
    return NextResponse.json({ sub: user.id, name: user.name, email: user.email, phone: user.phone });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
