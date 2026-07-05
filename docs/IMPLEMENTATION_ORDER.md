# ClawNote Implementation Order

This branch follows a staged product implementation order.

## Phase 1: Yuque-level document experience

Goal: Users can use ClawNote as an independent document knowledge base without AI.

Must-have capabilities:

- Document tree
- Folder/page hierarchy
- Move and sort documents
- Rich text editing
- Markdown import/export
- File upload and insertion
- Comments and annotations
- Version history and restore
- Share/publish links
- Trash/archive restore
- Search
- Templates
- Workspace settings and permissions

## Phase 2: Notion-level structured workspace

Goal: Users can organize work, tasks, and structured data.

Must-have capabilities:

- Task table
- Board/Gallery/Calendar views
- Field schema
- Filtering and sorting
- Page-as-record model
- Database block embedded in documents
- Relations
- Templates for records
- Drag-and-drop ordering

## Phase 3: ClawNote AI-native differentiation

Goal: Make the document system usable as an optional AI knowledge base and Agent workspace.

Must-have capabilities:

- ContentAsset and KnowledgeChunk indexing
- AI Drafts and AIEditProposal review flow
- Knowledge sync/reindex/status
- OpenClaw Agent APIs
- Semantic search with pgvector
- LLM provider router
- Memory extraction and approval
- Citation-based AI answers
- AI-generated documents as drafts by default

## Current rule

Document is the source of truth. Knowledge indexes are derived. AI writes to draft/proposal first unless explicitly allowed.
