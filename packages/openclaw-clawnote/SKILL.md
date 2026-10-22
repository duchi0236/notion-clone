---
name: clawnote
description: Use ClawNote as the trusted workspace for documents, tasks, records, calendar events, inbox items, approvals, and auditable Agent jobs.
---

# ClawNote workspace rules

- ClawNote is the source of truth for business data.
- Search and read context before proposing a change.
- Generated document content must be created as a draft; never overwrite a formal document directly.
- Work-item, record, and calendar writes use Preview first, then Apply only with an approved proposal.
- Include the active AgentJob id, source ids, and an idempotency key in every mutating call.
- Never attempt permanent deletion. Archive resources only when an explicitly exposed archive tool permits it.
- Report progress with concise user-visible step names. Do not report hidden reasoning.
- When a proposal is awaiting approval, stop the write path and tell the user exactly what will change.
- If an Apply call reports a version conflict, create a fresh Preview instead of retrying the stale proposal.
