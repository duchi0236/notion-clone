import { NextRequest, NextResponse } from "next/server";
import { generateMedia, type MediaKind, type ProviderConfig } from "@/lib/media-gen";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { getAiConfig } from "@/lib/ai-config";

export const runtime = "nodejs";

// 生成式媒体（文生图 / 文生视频）。供应商无关：默认 mock 占位，
// 控制台(AI → 媒体生成)配置供应商+Key 后接入真实供应商。
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { kind?: string; prompt?: string };
    const kind: MediaKind = body.kind === "video" ? "video" : "image";
    const prompt = (body.prompt || "").toString();

    // 读取该工作区为「图/视频」能力配置的供应商
    let cfg: ProviderConfig = {};
    try {
      const { workspace } = await ensureWorkspace();
      const ai = await getAiConfig(workspace.id);
      const map = (ai.mediaProviders as Record<string, ProviderConfig> | null) ?? {};
      cfg = map[kind] ?? {};
    } catch {
      /* 未登录/无配置时退回 env/mock */
    }

    const result = await generateMedia(kind, prompt, cfg);
    return NextResponse.json(result, { status: result.status === "error" ? 400 : 200 });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 },
    );
  }
}
