import { test } from "node:test";
import assert from "node:assert/strict";
import { countBy, matchesShare, runShareBatch, ShareBatchState } from "../lib/content/shareBatch";
import type { ContentShareInput } from "../lib/types/domain";
import { fakeShareBackend } from "./helpers/fakeShareBackend";
import { PDF, PHOTO, VIDEO } from "./helpers/fixtures";

const ME = "user-1";
const INPUT: ContentShareInput = { targetType: "LEAD", targetId: "lead-1", channel: "WHATSAPP", recipientName: "Testing Lead", message: "Hello Testing Lead, please find our items." };
const run = (api: Parameters<typeof runShareBatch>[0], assets = [VIDEO, PHOTO, PDF], previous?: ShareBatchState, startedAt = Date.now()) =>
  runShareBatch(api, assets, INPUT, { startedAt, actorId: ME, previous });

test("one item: one share record and one matching history entry (unchanged behaviour)", async () => {
  const be = fakeShareBackend({ actorId: ME });
  const state = await run(be.api, [VIDEO]);
  assert.equal(state["a-video"].status, "shared");
  assert.equal(be.shares.length, 1);
  assert.deepEqual(be.timeline.map((t) => [t.leadId, t.action, t.actorId]), [["lead-1", "CONTENT_SHARED", ME]]);
  const s = state["a-video"];
  assert.ok(s.status === "shared" && s.download?.url.includes("a-video-v1") && !s.recovered);
});

test("several items: one record and one history entry per item, each with the same message, target and person", async () => {
  const be = fakeShareBackend({ actorId: ME });
  const state = await run(be.api);
  assert.deepEqual(countBy(state), { shared: 3, notShared: 0, unconfirmed: 0, total: 3 });
  assert.deepEqual(be.shares.map((s) => s.assetId), ["a-video", "a-photo", "a-pdf"]);
  assert.equal(be.timeline.length, 3);
  for (const s of be.shares) assert.ok(matchesShare(s, INPUT, { startedAt: 0, actorId: ME }));
});

test("a refused item is reported as not shared, the others still go through, and nothing is recorded for it", async () => {
  const be = fakeShareBackend({ actorId: ME });
  be.plan("a-photo", { kind: "refuse", status: 409, message: "Archived content can’t be shared. Restore it first." });
  const state = await run(be.api);
  assert.equal(state["a-video"].status, "shared");
  assert.deepEqual(state["a-photo"], { status: "failed", message: "Archived content can’t be shared. Restore it first.", refused: true });
  assert.equal(state["a-pdf"].status, "shared");
  assert.deepEqual(be.shares.map((s) => s.assetId), ["a-video", "a-pdf"]);
  assert.equal(be.timeline.length, 2, "no history entry for the refused item");
});

test("a permission or sign-in refusal stops the batch: the rest are not attempted", async () => {
  for (const status of [401, 403]) {
    const be = fakeShareBackend({ actorId: ME });
    be.plan("a-photo", { kind: "refuse", status, message: "You don't have permission to share sales content." });
    const state = await run(be.api);
    assert.equal(state["a-video"].status, "shared");
    assert.equal(state["a-photo"].status, "failed");
    assert.equal(state["a-pdf"].status, "not-attempted");
    assert.deepEqual(be.sent, ["a-video", "a-photo"], `status ${status}: nothing sent after the refusal`);
  }
});

test("retrying sends only what was not shared, and never re-sends a shared item", async () => {
  const be = fakeShareBackend({ actorId: ME });
  be.plan("a-photo", { kind: "refuse", status: 409, message: "busy" });
  const startedAt = Date.now();
  const first = await run(be.api, undefined, undefined, startedAt);
  const second = await run(be.api, undefined, first, startedAt);
  assert.deepEqual(countBy(second), { shared: 3, notShared: 0, unconfirmed: 0, total: 3 });
  assert.deepEqual(be.sent, ["a-video", "a-photo", "a-pdf", "a-photo"]);
  assert.equal(be.shares.length, 3, "no duplicates");
  assert.equal(be.timeline.length, 3);
});

test("a share recorded but whose answer was lost is found in the item's history, not sent twice", async () => {
  const be = fakeShareBackend({ actorId: ME });
  be.plan("a-photo", { kind: "commit-then-drop" });
  const state = await run(be.api);
  const s = state["a-photo"];
  assert.equal(s.status, "shared");
  assert.ok(s.status === "shared" && s.recovered && s.download?.url.includes("a-photo-v1"));
  assert.equal(be.shares.length, 3);
  assert.deepEqual(be.sent, ["a-video", "a-photo", "a-pdf"]);
});

test("no answer and nothing in history: reported as not shared, and checked again before the retry", async () => {
  const be = fakeShareBackend({ actorId: ME });
  be.plan("a-photo", { kind: "drop-before-commit" });
  const startedAt = Date.now();
  const first = await run(be.api, undefined, undefined, startedAt);
  assert.deepEqual(first["a-photo"], { status: "failed", message: "Could not reach the RevenueOS backend. Check your connection and try again.", refused: false });
  // the server finished it after all, before the retry
  await be.api.share("a-photo", INPUT); // (simulates the late commit; counted in `sent`)
  const second = await run(be.api, undefined, first, startedAt);
  assert.ok(second["a-photo"].status === "shared" && second["a-photo"].recovered, "found in history, not sent again");
  assert.equal(be.shares.filter((s) => s.assetId === "a-photo").length, 1, "no duplicate");
});

test("when the history can't be read, an uncertain item is not re-sent until it can be checked", async () => {
  const be = fakeShareBackend({ actorId: ME });
  be.plan("a-photo", { kind: "commit-then-drop" });
  be.setHistoryDown(true);
  const startedAt = Date.now();
  const first = await run(be.api, undefined, undefined, startedAt);
  assert.equal(first["a-photo"].status, "unconfirmed");
  const second = await run(be.api, undefined, first, startedAt);
  assert.equal(second["a-photo"].status, "unconfirmed", "still can't check: not sent");
  assert.equal(be.sent.filter((x) => x === "a-photo").length, 1);
  be.setHistoryDown(false);
  const third = await run(be.api, undefined, second, startedAt);
  assert.ok(third["a-photo"].status === "shared" && third["a-photo"].recovered);
  assert.equal(be.shares.filter((s) => s.assetId === "a-photo").length, 1, "exactly one record");
  assert.equal(be.timeline.length, 3, "exactly one history entry per item");
});

test("a share in history only counts as this batch's if target, channel, message, person and time all match", () => {
  const base = { id: "s", assetId: "a", fileId: "f", version: 1, targetType: "LEAD" as const, lead: { id: "lead-1", customerName: "x", leadCode: null }, opportunity: null, customer: null,
    channel: "WHATSAPP" as const, recipientName: null, recipientPhone: null, message: INPUT.message!, actor: { id: ME, fullName: "You" }, createdAt: new Date().toISOString() };
  const o = { startedAt: Date.now(), actorId: ME };
  assert.ok(matchesShare(base, INPUT, o));
  assert.ok(!matchesShare({ ...base, lead: { id: "lead-2", customerName: "x", leadCode: null } }, INPUT, o), "other lead");
  assert.ok(!matchesShare({ ...base, channel: "DOWNLOAD" }, INPUT, o), "other channel");
  assert.ok(!matchesShare({ ...base, message: "other" }, INPUT, o), "other message");
  assert.ok(!matchesShare({ ...base, actor: { id: "someone-else", fullName: "Other" } }, INPUT, o), "other person");
  assert.ok(!matchesShare({ ...base, createdAt: new Date(Date.now() - 3_600_000).toISOString() }, INPUT, o), "an older share");
});

test("progress is reported item by item", async () => {
  const be = fakeShareBackend({ actorId: ME });
  const seen: string[] = [];
  await runShareBatch(be.api, [VIDEO, PHOTO], INPUT, { startedAt: Date.now(), actorId: ME, onUpdate: (s) => seen.push(`${s["a-video"].status}/${s["a-photo"].status}`) });
  assert.deepEqual(seen.slice(0, 4), ["pending/pending", "sharing/pending", "shared/pending", "shared/sharing"]);
  assert.equal(seen[seen.length - 1], "shared/shared");
});
