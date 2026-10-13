import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHookRunner } from "./helpers/hookRunner";

// The lead page shares content through ShareContentDialog, whose onShared must reload the lead's
// Activity & History: the backend writes the history entry in the same transaction as the share.
const runner = createHookRunner();
const timeline: Array<{ id: string; title: string }> = [{ id: "t1", title: "Lead created" }];
const calls = { getById: 0, getTimeline: 0 };
const repo = {
  leads: {
    getById: async (id: string) => (calls.getById++, { id, customerName: "Testing Lead" }),
    getTimeline: async () => (calls.getTimeline++, timeline.map((t) => ({ ...t }))),
  },
};

mock.module("react", { namedExports: runner.react, defaultExport: runner.react });
mock.module(new URL("../lib/repository/RepositoryProvider.tsx", import.meta.url).href, { namedExports: { useRepository: () => repo } });
const { useLeadDetail } = await import("../lib/hooks/useLeads");

test("a share made from the lead page shows on Activity & History without a page reload", async () => {
  const hook = runner.renderHook(() => useLeadDetail("lead-1"));
  await runner.settle();
  assert.deepEqual(hook.current.timeline.map((t: { id: string }) => t.id), ["t1"]);

  // the backend records the share and its history entry together
  timeline.unshift({ id: "t2", title: "Shared the video “Loom” (version 1) on WhatsApp." });

  // reloading the lead alone (what the page used to pass) leaves the history stale
  hook.current.refetch();
  await runner.settle();
  assert.deepEqual(hook.current.timeline.map((t: { id: string }) => t.id), ["t1"], "refetch reloads the lead only");

  // what the page passes now
  const before = { ...calls };
  hook.current.refreshAll();
  await runner.settle();
  assert.deepEqual(hook.current.timeline.map((t: { id: string }) => t.id), ["t2", "t1"]);
  assert.equal(calls.getTimeline, before.getTimeline + 1, "history reloaded once");
  assert.equal(calls.getById, before.getById + 1, "lead reloaded once");
});

test("the lead page passes refreshAll to the share dialog", () => {
  const page = readFileSync(new URL("../app/leads/[id]/page.tsx", import.meta.url), "utf8");
  const dialog = page.slice(page.indexOf("<ShareContentDialog"), page.indexOf("/>", page.indexOf("<ShareContentDialog")));
  assert.match(dialog, /onShared=\{refreshAll\}/);
});
