import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { AI_SKILLS } from "@/lib/ai-skills";
import { getAiConfig } from "@/lib/ai-config";

type MediaCap = { provider?: string; model?: string; baseUrl?: string; apiKey?: string };

// 去掉各能力的原始 Key，仅暴露是否已配置
function maskMedia(media: Record<string, MediaCap> | null | undefined) {
  const out: Record<string, { provider: string; model: string; baseUrl: string; hasApiKey: boolean }> = {};
  for (const [cap, v] of Object.entries(media ?? {})) {
    out[cap] = { provider: v?.provider ?? "", model: v?.model ?? "", baseUrl: v?.baseUrl ?? "", hasApiKey: Boolean(v?.apiKey) };
  }
  return out;
}

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const config = await getAiConfig(workspace.id);
  // never ship raw keys to the client — expose only whether each is set
  const { apiKey, mediaProviders, ...rest } = config;
  return NextResponse.json({
    config: { ...rest, hasApiKey: Boolean(apiKey), mediaProviders: maskMedia(mediaProviders as Record<string, MediaCap>) },
    skills: AI_SKILLS,
  });
}

export async function PUT(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const existing = await getAiConfig(workspace.id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.provider === "string") data.provider = body.provider;
  if (typeof body.model === "string") data.model = body.model;
  if (typeof body.baseUrl === "string") data.baseUrl = body.baseUrl;
  if (typeof body.temperature === "number") data.temperature = Math.max(0, Math.min(2, body.temperature));
  if (typeof body.maxTokens === "number") data.maxTokens = Math.max(256, Math.min(32000, Math.round(body.maxTokens)));
  if (Array.isArray(body.enabledSkills)) {
    const valid = new Set(AI_SKILLS.map((s) => s.id));
    data.enabledSkills = body.enabledSkills.filter((s: unknown) => typeof s === "string" && valid.has(s));
  }
  // only overwrite the key when a non-empty value is sent (so blank doesn't wipe it)
  if (typeof body.apiKey === "string" && body.apiKey.trim()) data.apiKey = body.apiKey.trim();
  if (body.apiKey === null) data.apiKey = "";

  // 媒体能力供应商：按能力合并，留空不覆盖已存的 Key
  if (body.mediaProviders && typeof body.mediaProviders === "object") {
    const cur = (existing.mediaProviders as Record<string, MediaCap>) ?? {};
    const next: Record<string, MediaCap> = { ...cur };
    for (const [cap, raw] of Object.entries(body.mediaProviders as Record<string, MediaCap>)) {
      const prev = cur[cap] ?? {};
      const inc = raw ?? {};
      next[cap] = {
        provider: typeof inc.provider === "string" ? inc.provider : prev.provider ?? "",
        model: typeof inc.model === "string" ? inc.model : prev.model ?? "",
        baseUrl: typeof inc.baseUrl === "string" ? inc.baseUrl : prev.baseUrl ?? "",
        apiKey:
          typeof inc.apiKey === "string" && inc.apiKey.trim()
            ? inc.apiKey.trim()
            : inc.apiKey === null
              ? ""
              : prev.apiKey ?? "",
      };
    }
    data.mediaProviders = next;
  }

  const config = await prisma.aiConfig.update({ where: { workspaceId: workspace.id }, data });
  const { apiKey, mediaProviders, ...rest } = config;
  return NextResponse.json({
    config: { ...rest, hasApiKey: Boolean(apiKey), mediaProviders: maskMedia(mediaProviders as Record<string, MediaCap>) },
  });
}
