const baseUrl = (process.env.CLAWNOTE_BASE_URL ?? "http://clawnote-web:3000").replace(/\/$/, "");
const token = process.env.CLAWNOTE_AGENT_TOKEN ?? "";

export async function clawnoteRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!token) throw new Error("CLAWNOTE_AGENT_TOKEN is not configured");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `ClawNote request failed (${response.status})`);
  return body;
}

export function toolResult(details: unknown, text: string) {
  return { content: [{ type: "text" as const, text }], details };
}
