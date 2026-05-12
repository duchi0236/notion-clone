import { NextResponse } from "next/server";

const PLACEHOLDER_TOKENS = new Set(["", "replace-with-agent-token", "dev", "development"]);

export function verifyAgentRequest(request: Request) {
  const expected = process.env.CLAWNOTE_AGENT_TOKEN ?? "";

  // Local-first default: if no real token is configured, keep the API usable during development.
  if (PLACEHOLDER_TOKENS.has(expected)) return null;

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!token || token !== expected) {
    return NextResponse.json(
      {
        error: "Unauthorized agent request",
        message: "Set Authorization: Bearer <CLAWNOTE_AGENT_TOKEN> when calling ClawNote agent APIs.",
      },
      { status: 401 }
    );
  }

  return null;
}
