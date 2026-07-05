# AI Decoupling Architecture

## Product principle

ClawNote is a document management product first. AI is an attachable capability layer.

The same content can be used in three independent ways:

1. Human document workspace: Notion/Yuque/Word/Excel-style writing and management.
2. External knowledge base: documents can be indexed and retrieved by AI without changing the document system.
3. AI writer: AI can create drafts, suggestions, tasks, and memories through controlled APIs.

## Core separation

```text
Document System
  - Owns source of truth
  - Provides editing, versioning, comments, permissions, files, tables
  - Works without AI

Knowledge Layer
  - Owns derived indexes
  - Converts documents/files/comments/tasks into assets and chunks
  - Can be rebuilt at any time
  - Supports keyword/vector/hybrid retrieval

AI Layer
  - Owns model calls and generated outputs
  - Produces drafts or proposals, not direct document mutation by default
  - Can be replaced by OpenAI, Claude, Gemini, DeepSeek, local models

Agent Layer
  - OpenClaw/MCP/Webhook integration
  - Calls stable APIs instead of database tables
```

## Data flow

### Human writing

```text
User edits Document
  -> Document Service saves source content
  -> Version Service snapshots changes
  -> Knowledge Sync creates ContentAsset
  -> Chunker creates KnowledgeChunk
  -> Embedding job updates vector index
```

### AI search

```text
Agent query
  -> Agent API
  -> Permission filter
  -> Knowledge Search
  -> Keyword + vector + metadata search
  -> Citation-ready chunks
```

### AI writing

```text
Agent/User asks AI to generate
  -> AI Service
  -> AIDraft or AIEditProposal
  -> User reviews
  -> Document Service commits accepted output
  -> Knowledge Layer reindexes
```

## Boundary rules

- Document is source of truth.
- Knowledge indexes are disposable derived data.
- AI cannot overwrite a formal document unless the user or policy explicitly approves it.
- AI generated content is stored as draft/proposal first.
- Every AI output must keep source citations and prompt metadata.
- Agent integration must only use Agent APIs.

## Module map

```text
/src/lib/document-service.ts       document CRUD boundary
/src/lib/knowledge-service.ts      asset/chunk/index/search boundary
/src/lib/ai-service.ts             model provider and fallback boundary
/src/lib/ai-draft-service.ts       AI draft/proposal workflow
/src/lib/agent-service.ts          OpenClaw/MCP bridge
/src/app/api/knowledge/*           external knowledge API
/src/app/api/ai-drafts/*           AI draft review API
/src/app/api/agent/*               stable Agent tool API
```

## Target API groups

### Document APIs

- GET /api/documents
- POST /api/documents
- GET /api/documents/:id
- PUT /api/documents/:id
- DELETE /api/documents/:id

### Knowledge APIs

- POST /api/knowledge/sync
- POST /api/knowledge/reindex
- POST /api/knowledge/search
- GET /api/knowledge/status

### AI Draft APIs

- GET /api/ai-drafts
- POST /api/ai-drafts
- GET /api/ai-drafts/:id
- POST /api/ai-drafts/:id/accept
- POST /api/ai-drafts/:id/reject
- POST /api/ai-drafts/:id/merge

### Agent APIs

- POST /api/agent/search
- POST /api/agent/create-draft
- POST /api/agent/propose-edit
- POST /api/agent/create-memory
- POST /api/agent/run

## Product UX

Navigation should clearly separate:

```text
Documents      human-authored source content
Knowledge      AI indexing status and retrieval settings
AI Drafts      AI generated output pending review
Memory         accepted long-term facts
Inbox          unprocessed external inputs
Tasks          work management
Files          object storage
Settings       permissions and integrations
```

## Implementation strategy

Phase 1: contract and service boundaries.
Phase 2: ContentAsset and KnowledgeChunk storage.
Phase 3: draft/proposal workflow.
Phase 4: pgvector embeddings and hybrid retrieval.
Phase 5: OpenClaw/MCP tool packaging.
