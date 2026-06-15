import { prisma } from "@/lib/prisma";
import { DEFAULT_ENABLED_SKILLS } from "@/lib/ai-skills";

// Resolve (or lazily create) the workspace's AI config.
export async function getAiConfig(workspaceId: string) {
  const existing = await prisma.aiConfig.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return prisma.aiConfig.create({ data: { workspaceId, enabledSkills: DEFAULT_ENABLED_SKILLS } });
}
