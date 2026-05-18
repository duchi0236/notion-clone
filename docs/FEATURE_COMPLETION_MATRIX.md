# ClawNote Feature Completion Matrix

This document tracks the functional completion status by product layer.

## Phase 1: Yuque-level document experience

| Feature | Status | Notes |
|---|---|---|
| Document-only mode | Done | `/clawnote` defaults to minimal document UI |
| Document tree | Done | nested tree, collapse/expand |
| Document search | Done | client search wired to tree |
| Document drag move | Done | drag to parent/root, API backed |
| Rich text editing | Done | TipTap editor |
| File upload in editor | Done | image insert and attachment link |
| Markdown export | Done | `/api/documents/:id/export/markdown` |
| Markdown import | Done | `/api/documents/import/markdown` |
| Comments API | Done | UI drawer available |
| Version history API | Done | snapshot and restore available |
| Version/comment drawer | Done | optional right side panel |
| Publish/share API | Done | public read page `/public/docs/:id` |
| Share dialog | Done | publish/unpublish and copy link |
| Archive/restore | Done | archive page and restore API |
| Permanent delete | Done | purge API |
| Permission dialog | Done | publish, AI-readable, AI-writable switches |
| Folder-level permissions | Planned | not required for personal MVP |
| Realtime collaboration | Planned | Phase 4+ |

## Phase 2: Notion-level structured workspace

| Feature | Status | Notes |
|---|---|---|
| Collection model | Done | Prisma Collection / CollectionRow |
| Collection CRUD | Done | `/api/collections` |
| Row CRUD | Partial | standalone row update endpoint added; nested endpoint still being completed |
| Table view | Done | `/database` MVP |
| Board view | Done | `/database` MVP |
| Calendar view | Done | `/database` MVP |
| Gallery view | Planned | model ready |
| Field schema editor | Next | next implementation target |
| Filter/sort UI | Next | next implementation target |
| Page-as-record | Planned | documentId on row exists |
| Relation/Rollup | Planned | future advanced database phase |
| Formula | Planned | future advanced database phase |
| Embedded database block | Planned | block type exists |

## Phase 3: ClawNote AI-native differentiation

| Feature | Status | Notes |
|---|---|---|
| AI decoupling design | Done | `docs/AI_DECOUPLING_ARCHITECTURE.md` |
| Domain contracts | Done | `src/lib/domain.ts` |
| Knowledge sync | Done | `/api/knowledge/sync` |
| Knowledge search | Done | `/api/knowledge/search` |
| Knowledge status | Done | `/api/knowledge/status` |
| AI Draft service | Done | draft stored as KnowledgeObject currently |
| AI Draft API | Done | list/create/status/merge |
| AI Draft UI | Done | `/ai-drafts` |
| Agent create draft | Done | `/api/agent/create-draft` |
| Agent direct write | Done | high-permission route retained |
| Memory review | Done | `/memory` |
| pgvector SQL | Done | `prisma/sql/pgvector.sql` |
| Real embedding worker | Planned | provider not wired yet |
| Rerank | Planned | future enhancement |
| Citation UI | Planned | search returns citation data |

## Mobile

| Feature | Status | Notes |
|---|---|---|
| Expo project | Done | `apps/mobile` |
| Root layout | Done | tabs based |
| Documents home | Done | API backed MVP |
| Database mobile | In progress | file creation partially blocked by safety checks |
| AI mobile | Planned | next target |
| Inbox mobile | Planned | next target |
| Offline cache | Planned | SQLite/MMKV stack declared |

## Production

| Feature | Status | Notes |
|---|---|---|
| Docker Compose | Done | dev and prod variants |
| Nginx config | Done | HTTPS reverse proxy template |
| Env validation | Done | `src/lib/env.ts` |
| Health check | Done | env + DB health |
| Backup scripts | Done | backup and restore shell scripts |
| CI build workflow | Done | GitHub Actions |
| Migrations | Planned | still using db push in some docs |
| Object storage | Planned | env prepared, code not wired |
| Rate limiting | Planned | not yet implemented |
| Observability | Planned | monitoring docs exist, runtime missing |
