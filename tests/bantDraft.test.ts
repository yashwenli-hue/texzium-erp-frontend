import { test } from "node:test";
import assert from "node:assert/strict";
import { changesBetween, draftFrom, parseBudgetAmount, previewOf } from "../lib/bantDraft";
import { MOCK_BANT_QUESTIONS, mockBantView } from "../lib/repository/mock/mockLeadBantRepository";
import type { BantAnswers } from "../lib/types/domain";

const EMPTY: BantAnswers = {
  budget: null, authority: null, need: null, timeline: null,
  budgetAmount: null, budgetNote: null, authorityNote: null, needNote: null, timelineNote: null,
};

test("the preview scores from the points sent with the questions, and grades only a complete BANT", () => {
  assert.deepEqual(previewOf(MOCK_BANT_QUESTIONS, EMPTY), { score: 0, answered: 0, complete: false, grade: null });
  assert.deepEqual(previewOf(MOCK_BANT_QUESTIONS, { ...EMPTY, budget: "CONFIRMED", need: "DEFINED" }), {
    score: 40, answered: 2, complete: false, grade: null,
  });
  assert.deepEqual(
    previewOf(MOCK_BANT_QUESTIONS, { ...EMPTY, budget: "INDICATIVE", authority: "INFLUENCER", need: "DEFINED", timeline: "WITHIN_3_MONTHS" }),
    { score: 63, answered: 4, complete: true, grade: "WARM" }
  );
  assert.equal(previewOf(MOCK_BANT_QUESTIONS, { ...EMPTY, budget: "CONFIRMED", authority: "DECISION_MAKER", need: "URGENT", timeline: "WITHIN_1_MONTH" }).grade, "HOT");
  assert.equal(previewOf(MOCK_BANT_QUESTIONS, { ...EMPTY, budget: "NONE", authority: "UNKNOWN", need: "NONE", timeline: "LATER" }).grade, "COLD");
});

test("only what changed is sent; blank notes become null; untouched notes are not sent", () => {
  const saved: BantAnswers = { ...EMPTY, budget: "CONFIRMED", budgetNote: "Approved" };
  assert.deepEqual(changesBetween(saved, { ...saved }), {});
  assert.deepEqual(changesBetween(saved, { ...saved, need: "URGENT" }), { need: "URGENT" });
  assert.deepEqual(changesBetween(saved, { ...saved, budget: null }), { budget: null });
  assert.deepEqual(changesBetween(saved, { ...saved, budgetNote: "   " }), { budgetNote: null });
  assert.deepEqual(changesBetween(saved, { ...saved, budgetNote: " Approved " }), {}, "only whitespace changed");
  assert.deepEqual(changesBetween(saved, { ...saved, authorityNote: "Plant head" }), { authorityNote: "Plant head" });
  assert.deepEqual(changesBetween(saved, { ...saved, budgetAmount: 500000 }), { budgetAmount: 500000 });
});

test("a draft starts as a copy of what is saved", () => {
  const view = mockBantView({ answers: { ...EMPTY, timeline: "LATER" }, completedAt: null, updatedAt: "2026-11-21T00:00:00Z" });
  const draft = draftFrom(view);
  assert.equal(draft.timeline, "LATER");
  draft.timeline = null;
  assert.equal(view.answers.timeline, "LATER", "editing the draft leaves the saved answers alone");
});

test("budget amounts: rupees with Indian or Western commas, a ₹ sign, up to 2 decimals", () => {
  assert.equal(parseBudgetAmount(""), null);
  assert.equal(parseBudgetAmount("5,00,000"), 500000);
  assert.equal(parseBudgetAmount("₹ 500,000.50"), 500000.5);
  assert.equal(parseBudgetAmount("12.345"), "invalid");
  assert.equal(parseBudgetAmount("-5"), "invalid");
  assert.equal(parseBudgetAmount("five lakh"), "invalid");
});

test("the mock scores, completes and grades the way the backend does", () => {
  const partial = mockBantView({ answers: { ...EMPTY, budget: "CONFIRMED" }, completedAt: null, updatedAt: "x" });
  assert.deepEqual([partial.score, partial.complete, partial.grade, partial.missing], [25, false, null, ["Authority", "Need", "Timeline"]]);
  const full = mockBantView({
    answers: { ...EMPTY, budget: "CONFIRMED", authority: "INFLUENCER", need: "URGENT", timeline: "WITHIN_3_MONTHS" },
    completedAt: "2026-11-21T00:00:00Z",
    updatedAt: "x",
  });
  assert.deepEqual([full.score, full.complete, full.grade], [83, true, "HOT"]);
});
