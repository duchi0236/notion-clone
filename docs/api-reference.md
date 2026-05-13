# ClawNote API Reference

Base URL in local development:

```text
http://localhost:3000
```

Main app routes:

```text
/clawnote   ClawNote workspace
/login      Login and registration page
```

## Health

### GET /api/health

Checks whether the app can connect to PostgreSQL.

```json
{
  "ok": true,
  "database": "connected",
  "app": "clawnote"
}
```

## Auth

### GET /api/auth/[...nextauth]
### POST /api/auth/[...nextauth]

NextAuth Credentials provider.

### POST /api/auth/register

Creates a user and a personal workspace.

```json
{
  "email": "me@example.com",
  "name": "Me",
  "password": "clawnote123"
}
```

## Documents

### GET /api/documents

Returns non-archived documents in the current user workspace. If no user is logged in, ClawNote uses the local default workspace.

Query params:

- `q`: optional keyword search

### POST /api/documents

Creates a document.

```json
{
  "title": "New document",
  "icon": "📄",
  "contentHtml": "<h1>Hello</h1><p>World</p>",
  "contentJson": { "type": "doc", "content": [] },
  "tags": ["note"]
}
```

### GET /api/documents/:id

Returns a document with recent versions and comments.

### PUT /api/documents/:id

Updates document fields and creates a version snapshot.

```json
{
  "title": "Updated title",
  "contentHtml": "<h1>Updated</h1>",
  "contentText": "Updated",
  "summary": "Updated",
  "tags": ["updated"]
}
```

### DELETE /api/documents/:id

Soft archives the document.

## Versions

### GET /api/documents/:id/versions

Lists recent document versions.

### POST /api/documents/:id/versions

Creates a manual version snapshot.

### POST /api/documents/:id/versions/:version/restore

Restores a document to a specific version and creates a new restore snapshot.

## Comments

### GET /api/documents/:id/comments

Lists comments and replies.

### POST /api/documents/:id/comments

Creates a comment or reply.

```json
{
  "content": "Looks good",
  "parentId": null
}
```

## Tasks / Collections

### GET /api/collections/tasks

Returns the default task collection and rows.

### POST /api/collections/tasks

Creates a task row.

```json
{
  "name": "Implement feature",
  "owner": "Me",
  "status": "未开始",
  "priority": "高",
  "progress": 0,
  "dueDate": "2026-05-14"
}
```

### PUT /api/collections/tasks/:rowId

Updates task row data.

### DELETE /api/collections/tasks/:rowId

Deletes a task row.

## Inbox

### GET /api/inbox

Lists inbox items.

### POST /api/inbox

Creates an inbox item.

```json
{
  "source": "OPENCLAW",
  "title": "Agent note",
  "content": "Raw input from agent"
}
```

### PUT /api/inbox/:id

Updates an inbox item.

### DELETE /api/inbox/:id

Deletes an inbox item.

## Memory

### GET /api/memory

Lists memories.

### POST /api/memory

Creates a memory. Memory defaults to pending review.

```json
{
  "content": "User prefers document-first products.",
  "tags": ["preference"],
  "confidence": 0.95,
  "status": "PENDING"
}
```

### PUT /api/memory/:id

Updates memory content or review status.

```json
{
  "status": "ACCEPTED"
}
```

### DELETE /api/memory/:id

Archives a memory.

## Templates

### GET /api/templates

Returns built-in and workspace templates.

### POST /api/templates

Creates a template.

## Search

### GET /api/search?q=keyword

Searches documents, memories, and inbox.

### POST /api/search

```json
{
  "query": "OpenClaw"
}
```

### POST /api/search/semantic

Semantic-search fallback API. It currently uses deterministic token overlap over `SearchIndex`. After pgvector is enabled, replace the ranking logic with vector distance.

```json
{
  "query": "OpenClaw 部署方案",
  "limit": 10
}
```

Optional pgvector setup SQL:

```text
prisma/sql/pgvector.sql
```

## Files

### GET /api/files

Lists uploaded files.

### POST /api/files

Uploads a file as multipart form data.

```bash
curl -X POST http://localhost:3000/api/files \
  -F "file=@./example.png"
```

Response:

```json
{
  "file": {
    "name": "example.png",
    "filename": "...png",
    "size": 1234,
    "type": "image/png",
    "url": "/uploads/...png"
  }
}
```

### DELETE /api/files?filename=:filename

Deletes an uploaded file. Path traversal is blocked by filename normalization.

## API Tokens

### GET /api/tokens

Lists generated API tokens without exposing raw token values.

### POST /api/tokens

Creates an API token for OpenClaw or other integrations. The raw token is returned once.

```json
{
  "name": "OpenClaw Agent Token",
  "scopes": ["agent:read", "agent:write", "memory:write", "run:write"]
}
```

### DELETE /api/tokens/:id

Deletes an API token.

## Agent APIs

Agent APIs support both:

```http
Authorization: Bearer <CLAWNOTE_AGENT_TOKEN>
```

and generated DB-backed API tokens from `/api/tokens`.

### POST /api/agent/search

Searches readable documents and accepted memories for agent context.

```json
{
  "query": "OpenClaw 部署",
  "limit": 8
}
```

### POST /api/agent/write-document

Writes an agent-generated document.

```json
{
  "title": "OpenClaw Run Summary",
  "content": "Today I deployed ClawNote.",
  "tags": ["OpenClaw"]
}
```

### POST /api/agent/create-memory

Creates a pending memory for user review.

```json
{
  "content": "The user prefers Notion-like products.",
  "tags": ["preference"],
  "confidence": 0.98
}
```

### GET /api/agent/run

Lists recent agent runs.

### POST /api/agent/run

Records an agent run.

```json
{
  "agentName": "OpenClaw",
  "input": { "task": "Analyze repo" },
  "output": { "status": "done" },
  "status": "completed",
  "documentIds": []
}
```

## OpenClaw Skill

The OpenClaw Skill manifest is available at:

```text
openclaw/clawnote.skill.yaml
```
