import { ID } from "../../types/common";
import { BANT_KEYS, BantAnswers, BantQuestion, LeadBantView, bantGradeOf } from "../../types/domain";
import { ILeadBantRepository, SaveLeadBantInput } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/**
 * MOCK (Phase A): an in-memory BANT per lead. The questions, options and points copy
 * the backend's (src/modules/revenueos/lead-bant/bant-questions.ts) so the mock scores
 * the way the server does; against the real API they come from GET /leads/:id/bant.
 */
export const MOCK_BANT_QUESTIONS: BantQuestion[] = [
  {
    key: "budget",
    letter: "B",
    title: "Budget",
    question: "Has the customer set aside a budget for this purchase?",
    options: [
      { value: "CONFIRMED", label: "Yes, budget approved", points: 25 },
      { value: "INDICATIVE", label: "A rough range, not yet approved", points: 15 },
      { value: "UNKNOWN", label: "Not discussed yet", points: 5 },
      { value: "NONE", label: "No budget", points: 0 },
    ],
  },
  {
    key: "authority",
    letter: "A",
    title: "Authority",
    question: "Who are we talking to?",
    options: [
      { value: "DECISION_MAKER", label: "The person who decides", points: 25 },
      { value: "INFLUENCER", label: "Someone who recommends to the decision maker", points: 15 },
      { value: "USER_ONLY", label: "A user with no say in the purchase", points: 5 },
      { value: "UNKNOWN", label: "Not known yet", points: 0 },
    ],
  },
  {
    key: "need",
    letter: "N",
    title: "Need",
    question: "How clear is the requirement?",
    options: [
      { value: "URGENT", label: "Clear requirement, needed now", points: 25 },
      { value: "DEFINED", label: "Clear requirement, not urgent", points: 15 },
      { value: "EXPLORING", label: "Still exploring options", points: 5 },
      { value: "NONE", label: "No real need", points: 0 },
    ],
  },
  {
    key: "timeline",
    letter: "T",
    title: "Timeline",
    question: "When do they plan to buy?",
    options: [
      { value: "WITHIN_1_MONTH", label: "Within a month", points: 25 },
      { value: "WITHIN_3_MONTHS", label: "Within 3 months", points: 18 },
      { value: "WITHIN_6_MONTHS", label: "Within 6 months", points: 10 },
      { value: "LATER", label: "Later, or no date yet", points: 0 },
    ],
  },
];

const EMPTY: BantAnswers = {
  budget: null,
  authority: null,
  need: null,
  timeline: null,
  budgetAmount: null,
  budgetNote: null,
  authorityNote: null,
  needNote: null,
  timelineNote: null,
};

interface Stored {
  answers: BantAnswers;
  completedAt: string | null;
  updatedAt: string;
}
export const mockBants = new Map<ID, Stored>();

export function mockBantView(stored: Stored | undefined): LeadBantView {
  const answers = stored?.answers ?? EMPTY;
  const score = MOCK_BANT_QUESTIONS.reduce(
    (sum, q) => sum + (q.options.find((o) => o.value === answers[q.key])?.points ?? 0),
    0
  );
  const missing = MOCK_BANT_QUESTIONS.filter((q) => !answers[q.key]).map((q) => q.title);
  const complete = missing.length === 0;
  return {
    questions: MOCK_BANT_QUESTIONS,
    answers,
    score,
    grade: complete ? bantGradeOf(score) : null,
    complete,
    missing,
    completedAt: stored?.completedAt ?? null,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export class MockLeadBantRepository implements ILeadBantRepository {
  async get(leadId: ID): Promise<LeadBantView> {
    if (!db.leads.getById(leadId)) throw new Error("Lead not found.");
    return delay(mockBantView(mockBants.get(leadId)));
  }

  async save(leadId: ID, input: SaveLeadBantInput): Promise<LeadBantView> {
    if (!db.leads.getById(leadId)) throw new Error("Lead not found.");
    const prev = mockBants.get(leadId);
    const answers: BantAnswers = { ...(prev?.answers ?? EMPTY) };
    for (const [k, v] of Object.entries(input) as [keyof BantAnswers, never][]) {
      if (v !== undefined) (answers as unknown as Record<string, unknown>)[k] = typeof v === "string" && (v as string).trim() === "" ? null : v;
    }
    const complete = BANT_KEYS.every((k) => !!answers[k]);
    const now = new Date().toISOString();
    const stored: Stored = { answers, completedAt: complete ? (prev?.completedAt ?? now) : null, updatedAt: now };
    mockBants.set(leadId, stored);
    const view = mockBantView(stored);
    db.leads.update(leadId, { bant: { score: view.score, completedAt: view.completedAt } });
    return delay(view);
  }
}
