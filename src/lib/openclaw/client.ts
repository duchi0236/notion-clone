export type OpenClawResponse = {
  id?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
    text?: string;
  }>;
  error?: { message?: string };
};

export class OpenClawClient {
  private readonly baseUrl = (process.env.OPENCLAW_GATEWAY_URL ?? "http://openclaw-gateway:18789").replace(/\/$/, "");
  private readonly token = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
  private readonly agentId = process.env.OPENCLAW_AGENT_ID ?? "main";

  async respond(input: {
    message: string;
    sessionKey: string;
    userId: string;
    instructions?: string;
    previousResponseId?: string | null;
  }) {
    if (!this.token) throw new Error("OPENCLAW_GATEWAY_TOKEN is not configured");
    const response = await fetch(`${this.baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        "x-openclaw-agent-id": this.agentId,
        "x-openclaw-session-key": input.sessionKey,
      },
      body: JSON.stringify({
        model: `openclaw/${this.agentId}`,
        input: input.message,
        instructions: input.instructions,
        user: input.userId,
        previous_response_id: input.previousResponseId ?? undefined,
        stream: false,
      }),
      signal: AbortSignal.timeout(Number(process.env.OPENCLAW_REQUEST_TIMEOUT_MS ?? 180_000)),
    });
    const data = await response.json().catch(() => ({})) as OpenClawResponse;
    if (!response.ok) throw new Error(data.error?.message ?? `OpenClaw request failed (${response.status})`);
    const text = (data.output ?? [])
      .flatMap((item) => item.content?.map((part) => part.text ?? "") ?? [item.text ?? ""])
      .filter(Boolean)
      .join("\n\n")
      .trim();
    return { responseId: data.id ?? null, text: text || "OpenClaw 已完成处理，但没有返回文本结果。", raw: data };
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/readyz`, { signal: AbortSignal.timeout(5_000) });
    return response.ok;
  }
}

export const openClawClient = new OpenClawClient();
