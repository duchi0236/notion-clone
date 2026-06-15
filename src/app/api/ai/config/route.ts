import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { AI_SKILLS } from "@/lib/ai-skills";
import { getAiConfig } from "@/lib/ai-config";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const config = await getAiConfig(workspace.id);
  // never ship the raw key to the client — expose only whether it's set
  const { apiKey, ...rest } = config;
  return NextResponse.json({ config: { ...rest, hasApiKey: Boolean(apiKey) }, skills: AI_SKILLS });
}

export async function PUT(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  await getAiConfig(workspace.id);
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

  const config = await prisma.aiConfig.update({ where: { workspaceId: workspace.id }, data });
  const { apiKey, ...rest } = config;
  return NextResponse.json({ config: { ...rest, hasApiKey: Boolean(apiKey) } });
}
