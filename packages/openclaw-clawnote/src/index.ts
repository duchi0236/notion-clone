import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { clawnoteRequest, toolResult } from "./client.js";

const JobId = Type.String({ minLength: 1 });
const IdempotencyKey = Type.String({ minLength: 8 });
const SourceIds = Type.Optional(Type.Array(Type.String()));

function register(api: any, descriptor: any, optional = false) {
  api.registerTool(descriptor, optional ? { optional: true } : undefined);
}

const plugin: ReturnType<typeof definePluginEntry> = definePluginEntry({
  id: "clawnote",
  name: "ClawNote",
  description: "ClawNote workspace tools",
  register(api) {
    register(api, {
      name: "clawnote_search_workspace",
      description: "Search readable ClawNote documents, work items, records, and calendar events.",
      parameters: Type.Object({
        query: Type.String(),
        projectId: Type.Optional(Type.String()),
        resourceTypes: Type.Optional(Type.Array(Type.String())),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
      }),
      async execute(_id: string, params: unknown) {
        const details = await clawnoteRequest<any>("/api/agent/v1/context/search", { method: "POST", body: JSON.stringify(params) });
        return toolResult(details, `Found ${details.results?.length ?? 0} ClawNote resources.`);
      },
    });

    register(api, {
      name: "clawnote_get_document",
      description: "Read one agent-readable ClawNote document.",
      parameters: Type.Object({ id: Type.String(), projectId: Type.Optional(Type.String()) }),
      async execute(_id: string, params: { id: string; projectId?: string }) {
        const suffix = params.projectId ? `?projectId=${encodeURIComponent(params.projectId)}` : "";
        const details = await clawnoteRequest<any>(`/api/agent/v1/documents/${encodeURIComponent(params.id)}${suffix}`);
        return toolResult(details, `Loaded document: ${details.document?.title ?? params.id}`);
      },
    });

    register(api, {
      name: "clawnote_query_records",
      description: "Query records from one ClawNote data table.",
      parameters: Type.Object({ tableId: Type.String(), projectId: Type.Optional(Type.String()), limit: Type.Optional(Type.Number()), cursor: Type.Optional(Type.String()) }),
      async execute(_id: string, params: unknown) {
        const details = await clawnoteRequest<any>("/api/agent/v1/records/query", { method: "POST", body: JSON.stringify(params) });
        return toolResult(details, `Loaded ${details.rows?.length ?? 0} records.`);
      },
    });

    register(api, {
      name: "clawnote_list_work_items",
      description: "Search ClawNote work items using a natural-language query.",
      parameters: Type.Object({ query: Type.Optional(Type.String()), projectId: Type.Optional(Type.String()), limit: Type.Optional(Type.Number()) }),
      async execute(_id: string, params: { query?: string; projectId?: string; limit?: number }) {
        const details = await clawnoteRequest<any>("/api/agent/v1/context/search", {
          method: "POST",
          body: JSON.stringify({ query: params.query ?? "*", projectId: params.projectId, resourceTypes: ["work-item"], limit: params.limit ?? 20 }),
        });
        return toolResult(details, `Loaded ${details.results?.length ?? 0} work items.`);
      },
    });

    register(api, {
      name: "clawnote_list_calendar_events",
      description: "Search ClawNote calendar events.",
      parameters: Type.Object({ query: Type.Optional(Type.String()), projectId: Type.Optional(Type.String()), limit: Type.Optional(Type.Number()) }),
      async execute(_id: string, params: { query?: string; projectId?: string; limit?: number }) {
        const details = await clawnoteRequest<any>("/api/agent/v1/context/search", {
          method: "POST",
          body: JSON.stringify({ query: params.query ?? "*", projectId: params.projectId, resourceTypes: ["calendar-event"], limit: params.limit ?? 20 }),
        });
        return toolResult(details, `Loaded ${details.results?.length ?? 0} calendar events.`);
      },
    });

    register(api, {
      name: "clawnote_create_document_draft",
      description: "Create an AI draft for review. This never overwrites a formal document.",
      parameters: Type.Object({
        jobId: Type.Optional(JobId),
        title: Type.Optional(Type.String()),
        content: Type.String(),
        targetId: Type.Optional(Type.String()),
        projectId: Type.Optional(Type.String()),
        prompt: Type.Optional(Type.String()),
        sourceIds: SourceIds,
        idempotencyKey: IdempotencyKey,
      }),
      async execute(_id: string, params: unknown) {
        const details = await clawnoteRequest<any>("/api/agent/v1/drafts", { method: "POST", body: JSON.stringify(params) });
        return toolResult(details, `Created draft: ${details.draft?.title ?? details.draft?.id ?? "draft"}`);
      },
    }, true);

    const previewTools = [
      ["clawnote_preview_work_items", "/api/agent/v1/work-items/preview", "Preview work items before creating them.", "items"],
      ["clawnote_preview_record_changes", "/api/agent/v1/records/preview", "Preview data-table record changes.", "patches"],
      ["clawnote_preview_calendar_changes", "/api/agent/v1/calendar/preview", "Preview calendar changes and conflicts.", "events"],
    ] as const;
    for (const [name, path, description, valueKey] of previewTools) {
      register(api, {
        name,
        description,
        parameters: Type.Object({
          jobId: JobId,
          tableId: Type.Optional(Type.String()),
          projectId: Type.Optional(Type.String()),
          [valueKey]: Type.Array(Type.Record(Type.String(), Type.Unknown())),
          sourceIds: SourceIds,
        }),
        async execute(_id: string, params: unknown) {
          const details = await clawnoteRequest<any>(path, { method: "POST", body: JSON.stringify(params) });
          return toolResult(details, details.proposal?.summary ?? "Proposal created and awaiting approval.");
        },
      }, true);
    }

    const applyTools = [
      ["clawnote_apply_work_items", "/api/agent/v1/work-items/apply", "Apply an approved work-item proposal."],
      ["clawnote_apply_record_changes", "/api/agent/v1/records/apply", "Apply an approved record-change proposal."],
      ["clawnote_apply_calendar_changes", "/api/agent/v1/calendar/apply", "Apply an approved calendar proposal."],
    ] as const;
    for (const [name, path, description] of applyTools) {
      register(api, {
        name,
        description,
        parameters: Type.Object({
          jobId: JobId,
          proposalId: Type.String(),
          approvalId: Type.String(),
          idempotencyKey: IdempotencyKey,
        }),
        async execute(_id: string, params: unknown) {
          const details = await clawnoteRequest<any>(path, { method: "POST", body: JSON.stringify(params) });
          return toolResult(details, "Approved ClawNote changes were applied.");
        },
      }, true);
    }

    register(api, {
      name: "clawnote_get_job",
      description: "Read the current ClawNote AgentJob, steps, approvals, and change sets.",
      parameters: Type.Object({ jobId: JobId }),
      async execute(_id: string, params: { jobId: string }) {
        const details = await clawnoteRequest<any>(`/api/agent/v1/jobs/${encodeURIComponent(params.jobId)}`);
        return toolResult(details, `AgentJob status: ${details.job?.status ?? "unknown"}`);
      },
    });

    register(api, {
      name: "clawnote_report_job_progress",
      description: "Report one concise, user-visible AgentJob step. Never include hidden reasoning.",
      parameters: Type.Object({
        jobId: JobId,
        sequence: Type.Number({ minimum: 1 }),
        title: Type.String(),
        toolName: Type.Optional(Type.String()),
        status: Type.Union([Type.Literal("RUNNING"), Type.Literal("COMPLETED"), Type.Literal("FAILED"), Type.Literal("SKIPPED")]),
        output: Type.Optional(Type.Unknown()),
        error: Type.Optional(Type.Unknown()),
      }),
      async execute(_id: string, params: any) {
        const { jobId, ...body } = params;
        const details = await clawnoteRequest<any>(`/api/agent/v1/jobs/${encodeURIComponent(jobId)}/progress`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return toolResult(details, `Progress recorded: ${params.title}`);
      },
    }, true);
  },
});

export default plugin;
