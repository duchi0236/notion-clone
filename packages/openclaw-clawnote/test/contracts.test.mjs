import assert from "node:assert/strict";
import test from "node:test";
import plugin from "../dist/index.js";

test("registers the complete ClawNote v1 tool contract", () => {
  const tools = new Map();
  plugin.register({
    registerTool(tool, options) {
      tools.set(tool.name, { tool, options });
    },
  });

  const expected = [
    "clawnote_search_workspace",
    "clawnote_get_document",
    "clawnote_query_records",
    "clawnote_list_work_items",
    "clawnote_list_calendar_events",
    "clawnote_create_document_draft",
    "clawnote_preview_work_items",
    "clawnote_apply_work_items",
    "clawnote_preview_record_changes",
    "clawnote_apply_record_changes",
    "clawnote_preview_calendar_changes",
    "clawnote_apply_calendar_changes",
    "clawnote_get_job",
    "clawnote_report_job_progress",
  ];
  assert.deepEqual([...tools.keys()].sort(), expected.sort());
  for (const name of expected) {
    assert.equal(typeof tools.get(name).tool.execute, "function");
    assert.ok(tools.get(name).tool.parameters);
  }
});

test("keeps mutating tools optional and Apply requires proposal plus approval", () => {
  const tools = new Map();
  plugin.register({
    registerTool(tool, options) {
      tools.set(tool.name, { tool, options });
    },
  });

  for (const [name, registration] of tools) {
    if (/_(create|preview|apply|report)_/.test(name)) {
      assert.equal(registration.options?.optional, true, `${name} must be optional`);
    }
    if (name.includes("_apply_")) {
      const properties = registration.tool.parameters.properties;
      assert.ok(properties.proposalId, `${name} must require proposalId`);
      assert.ok(properties.approvalId, `${name} must require approvalId`);
      assert.ok(properties.idempotencyKey, `${name} must require idempotencyKey`);
    }
  }
});
