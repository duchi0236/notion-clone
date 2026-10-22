import { ensureWorkspace } from "@/lib/clawnote-store";
import { revertAgentJob } from "@/lib/commands";
import { routeError } from "@/lib/agent-v1";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const result = await revertAgentJob(workspace.id, params.id, user.id);
    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
