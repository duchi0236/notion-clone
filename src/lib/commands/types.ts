export type CommandActor = {
  type: "user" | "agent" | "automation";
  userId: string;
  delegatedByUserId?: string;
  agentId?: string;
  agentJobId?: string;
  scopes?: string[];
};

export type CommandContext = {
  actor: CommandActor;
  workspaceId: string;
  projectId?: string;
  idempotencyKey: string;
  expectedVersion?: number;
  reason?: string;
  sourceIds?: string[];
};

export class CommandError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "COMMAND_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
