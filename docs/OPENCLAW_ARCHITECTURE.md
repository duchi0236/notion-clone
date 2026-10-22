# ClawNote × OpenClaw implementation

ClawNote owns business data, permissions, approvals, audit history and undo.
OpenClaw owns model selection, sessions, planning and tool execution. OpenClaw
must never connect to PostgreSQL or Prisma.

## Runtime flow

```text
AI Workbench
  -> POST /api/ai/conversations/:id/messages
  -> AgentJob(QUEUED)
  -> clawnote-worker claims PLANNING
  -> OpenClaw /v1/responses
  -> @clawnote/openclaw-plugin
  -> /api/agent/v1/* with scoped Agent Token
  -> Preview / Approval / Apply
  -> commands transaction
  -> CommandExecution + ChangeSet + OutboxEvent
  -> SSE /api/agent-jobs/:id/events
```

The browser receives neither the OpenClaw Gateway Token nor the ClawNote Agent
Token. A production Agent Token is bound to a workspace, delegated user,
optional project list, expiry and granular scopes. Legacy or wildcard tokens
are rejected.

## First setup

1. Use Node `24.15.0` or newer in the Node 24 line.
2. Run `npm install`, `npm run db:generate`, then apply the Prisma schema with
   the repository's existing `npm run db:push` workflow.
3. Start ClawNote and create an Agent Token through `POST /api/tokens` while
   authenticated. The default token is read-oriented. Add only the write scopes
   actually required by the deployment.
4. Set `CLAWNOTE_OPENCLAW_TOKEN` for development Compose, or
   `CLAWNOTE_AGENT_TOKEN` in `.env.production`.
5. Generate a separate `OPENCLAW_GATEWAY_TOKEN` and start Compose.

For a fresh development database, start the base services first with
`docker compose up -d postgres redis web worker collab`, create the scoped
token, then run `docker compose --profile agent up -d openclaw-gateway`.
The Gateway entrypoint fails closed when either token is missing.

The OpenClaw image is pinned to version `2026.7.1` and manifest digest
`sha256:6a31d44b2944e7adcd2b582bf6fb463111264ebca97a0201795b799135bd102c`.
The custom image builds, checks, packs and installs the plugin before starting
the Gateway. Do not replace the digest with `latest`.

## Authorization behavior

- Read/search operations run automatically.
- Document generation creates an `AI_DRAFT`; it does not overwrite a formal
  document.
- Task and calendar proposals can auto-approve only when the Job's stored
  authorization has `projectWrite: true` or explicitly lists the action.
- Record changes always require a pending Approval.
- Apply requires matching `proposalId`, `approvalId` and `idempotencyKey`.
- Restricted Agent Tokens must supply an allowed `projectId` for every write.
- There is no permanent-delete tool. Job undo reverses ChangeSets; formal
  documents are archived rather than deleted.

## Recovery

The Worker delivers Outbox events with exponential retry. On startup it moves
stale `PLANNING`, `RUNNING` or `VERIFYING` Jobs to `WAITING_REVIEW`, preventing
automatic replay of an uncertain Apply. A user can review and continue the Job.
Command executions are unique by idempotency key; a racing transaction is
rolled back and returns the already committed result.

SSE sends complete Job snapshots and event sequence numbers. Reconnecting
clients can reload `GET /api/agent-jobs/:id` without re-running any command.
When the Gateway is unavailable, the compatibility chat endpoint only performs
local read-only search and never writes.

## Verification

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run build
npm --prefix packages/openclaw-clawnote run check
npm --prefix packages/openclaw-clawnote run test
npm --prefix packages/openclaw-clawnote run pack:check
```
