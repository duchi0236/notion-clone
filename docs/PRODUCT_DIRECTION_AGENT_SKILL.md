# ClawNote Product Direction: Document-first, Agent-usable

## Positioning

ClawNote should stay a document product first. AI should not be embedded as a forced chat surface inside every workflow. Instead, ClawNote should become a stable document and knowledge substrate that AI agents can retrieve from, propose changes to, and write back into through controlled APIs.

```text
ClawNote = Document workspace + Knowledge index + Draft review + Memory review + Agent Skill
```

## Product thesis

The core user experience is still human-owned writing and knowledge management:

- Documents are formal source-of-truth content.
- Knowledge indexes are derived and rebuildable.
- AI outputs are drafts or proposals before they become official content.
- Memories are pending facts before they become accepted long-term context.
- Agents interact through Skill/API contracts, not internal database tables.

This prevents the product from becoming a generic "Notion + chatbot" and keeps it closer to an AI-era personal knowledge operating system.

## User-facing navigation

```text
Documents     Formal notes, docs, plans, specs, records
Knowledge     Index health, retrieval testing, citation coverage
AI Drafts     AI/Agent-generated output waiting for review
Memory        Long-term facts proposed by AI and approved by the user
Inbox         Raw external inputs waiting to be processed
Tasks         Structured execution items
Agent API     Tokens, tool contracts, run logs, Skill instructions
Settings      Workspace permissions and integrations
```

## Agent-facing workflow

### Before a task

The agent should call `search_context` to load relevant knowledge chunks and accepted memories.

```text
Agent task
  -> search_context
  -> knowledge chunks + citations + accepted memories
  -> agent plans work with grounded context
```

### During a task

The agent may create drafts, notes, or proposed edits, but should avoid mutating formal documents directly.

```text
Agent generates content
  -> create_ai_draft
  -> user reviews
  -> merge as new document or replace target document
```

### After a task

The agent can record what happened and submit candidate long-term memory.

```text
Agent completes task
  -> create_ai_draft for execution summary
  -> create_memory for reusable facts, pending review
  -> log_run for traceability
```

## Default safety rule

Direct writes are allowed only when explicitly approved. The default path should be:

```text
AI/Agent output -> AI Draft -> User review -> Document commit -> Knowledge reindex
```

## Skill contract

The initial ClawNote Skill should expose a small, stable surface:

| Tool | Purpose | Default behavior |
|---|---|---|
| `search_context` | Retrieve knowledge and accepted memories | Read-only |
| `create_ai_draft` | Save generated content for review | Draft-first |
| `create_memory` | Submit long-term facts | Pending review |
| `log_run` | Record agent execution | Append-only |
| `write_document` | Directly create formal documents | Explicit approval only |

## Implementation priorities

1. Keep the document workspace useful without AI.
2. Route all Agent search through the Knowledge Layer.
3. Make AI Draft the default write path for generated content.
4. Keep Memory approval separate from document approval.
5. Add real `ContentAsset`, `KnowledgeChunk`, and embedding storage when the draft-first workflow is stable.
6. Add citation-based AI answers after retrieval quality is good enough.
7. Package `openclaw/clawnote.skill.yaml` as the canonical agent integration surface.

## Anti-goals

- Do not make the main product a generic chat application.
- Do not let agents silently overwrite formal documents.
- Do not make agents depend on Prisma schema details.
- Do not treat generated memory as accepted memory without user review.
