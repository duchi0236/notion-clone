# OpenClaw Integration Guide

ClawNote exposes a small HTTP API that OpenClaw can use as a persistent knowledge tool.

## Environment

Set a real token in production:

```env
CLAWNOTE_AGENT_TOKEN="your-long-random-token"
```

When this value is empty or left as `replace-with-agent-token`, agent APIs remain open for local development. In production, always configure a real token and pass it as a Bearer token.

## Tool design

Suggested OpenClaw tool names:

```yaml
name: clawnote
description: Persistent personal knowledge workspace for OpenClaw
base_url: http://localhost:3000
headers:
  Authorization: Bearer ${CLAWNOTE_AGENT_TOKEN}
tools:
  - search_context
  - write_document
  - create_memory
  - log_run
```

## Search context

```http
POST /api/agent/search
Content-Type: application/json
Authorization: Bearer <token>
```

Request:

```json
{
  "query": "OpenClaw 部署",
  "limit": 8
}
```

Response:

```json
{
  "context": [
    {
      "type": "document",
      "id": "...",
      "title": "OpenClaw 个人部署方案",
      "summary": "...",
      "text": "...",
      "tags": ["OpenClaw"]
    }
  ]
}
```

## Write document

```http
POST /api/agent/write-document
Content-Type: application/json
Authorization: Bearer <token>
```

Request:

```json
{
  "title": "OpenClaw 执行记录",
  "content": "今天完成了 API 接入。",
  "tags": ["OpenClaw", "执行记录"],
  "agentName": "OpenClaw"
}
```

## Create memory

Memory is created as `PENDING` by default. The user should review and accept it in the Memory page.

```http
POST /api/agent/create-memory
Content-Type: application/json
Authorization: Bearer <token>
```

Request:

```json
{
  "content": "用户希望 ClawNote 更像 Notion / 语雀 / Word / Excel。",
  "tags": ["产品定位"],
  "confidence": 0.98,
  "sourceType": "OPENCLAW"
}
```

## Log run

```http
POST /api/agent/run
Content-Type: application/json
Authorization: Bearer <token>
```

Request:

```json
{
  "agentName": "OpenClaw",
  "input": { "task": "分析项目" },
  "output": { "status": "done" },
  "status": "completed",
  "documentIds": []
}
```

## Recommended OpenClaw workflow

1. Before a task, call `search_context` with the user query.
2. During a task, keep raw progress in OpenClaw workspace files.
3. After a task, call `write_document` to persist a clean execution note.
4. If a stable user preference or reusable fact is discovered, call `create_memory`.
5. Call `log_run` for traceability.

## Safety rules

- Do not directly create `ACCEPTED` memories unless the user explicitly approved it.
- Prefer writing execution summaries as documents.
- Keep raw logs short and searchable.
- Include source metadata whenever possible.
