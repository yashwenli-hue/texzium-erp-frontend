import { BANT_KEYS, BantAnswers, BantGrade, BantQuestion, LeadBantView, bantGradeOf } from "./types/domain";
import { SaveLeadBantInput } from "./repository/interfaces";

/**
 * The BANT form's working copy. The saved score always comes from the server; while
 * editing, the panel previews the score from the points the server sent with the
 * questions, so the person sees what their answers are worth before saving.
 */
export type BantDraft = BantAnswers;

export function draftFrom(view: LeadBantView): BantDraft {
  return { ...view.answers };
}

const NOTE_FIELDS = ["budgetNote", "authorityNote", "needNote", "timelineNote"] as const;
const norm = (v: string | null) => (v && v.trim() ? v.trim() : null);

/** Only what changed, ready for PUT /leads/:id/bant (empty when nothing did). */
export function changesBetween(saved: BantAnswers, draft: BantDraft): SaveLeadBantInput {
  const out: SaveLeadBantInput = {};
  for (const k of BANT_KEYS) if (draft[k] !== saved[k]) out[k] = draft[k];
  for (const k of NOTE_FIELDS) if (norm(draft[k]) !== norm(saved[k])) out[k] = norm(draft[k]);
  if ((draft.budgetAmount ?? null) !== (saved.budgetAmount ?? null)) out.budgetAmount = draft.budgetAmount ?? null;
  return out;
}

export interface BantPreview {
  score: number;
  answered: number;
  complete: boolean;
  grade: BantGrade | null;
}

export function previewOf(questions: BantQuestion[], draft: BantDraft): BantPreview {
  let score = 0;
  let answered = 0;
  for (const q of questions) {
    const chosen = q.options.find((o) => o.value === draft[q.key]);
    if (chosen) {
      score += chosen.points;
      answered += 1;
    }
  }
  const complete = answered === questions.length && questions.length > 0;
  return { score, answered, complete, grade: complete ? bantGradeOf(score) : null };
}

/** Rupees typed into the budget box: digits with optional commas and up to 2 decimals. */
export function parseBudgetAmount(text: string): number | null | "invalid" {
  const t = text.replace(/[,\s₹]/g, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return "invalid";
  return Number(t);
}
