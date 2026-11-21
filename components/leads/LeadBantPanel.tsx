"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag, TagColor } from "../ui/Tag";
import { TextField, TextAreaField } from "../ui/FormField";
import { useToast } from "../ui/Toast";
import { useLeadBant } from "../../lib/hooks/useLeadBant";
import { BANT_GRADE_LABEL, BantGrade } from "../../lib/types/domain";
import { BantDraft, changesBetween, draftFrom, parseBudgetAmount, previewOf } from "../../lib/bantDraft";
import { formatDateTime } from "../../lib/format";

const GRADE_COLOR: Record<BantGrade, TagColor> = { HOT: "g", WARM: "w", COLD: "b" };

/**
 * BANT analysis on the lead page: one question per letter (Budget, Authority, Need,
 * Timeline). Saves what is answered so far; the server scores it. A lead can only be
 * qualified and handed to Sales once all four are answered.
 */
export function LeadBantPanel({
  leadId,
  canEdit,
  readOnlyReason,
  onSaved,
}: {
  leadId: string;
  canEdit: boolean;
  /** Why the form is read-only, when it is. */
  readOnlyReason?: string;
  /** Called after a save, so the lead (and its Qualify button) refresh. */
  onSaved?: () => void;
}) {
  const toast = useToast();
  const { bant, loading, error, refetch, save } = useLeadBant(leadId);
  const [draft, setDraft] = useState<BantDraft | null>(null);
  const [budgetText, setBudgetText] = useState("");
  const [saving, setSaving] = useState(false);

  // Start from what is saved, and again after every save or reload.
  useEffect(() => {
    if (bant) {
      setDraft(draftFrom(bant));
      setBudgetText(bant.answers.budgetAmount == null ? "" : String(bant.answers.budgetAmount));
    }
  }, [bant]);

  const budgetParsed = parseBudgetAmount(budgetText);
  const effectiveDraft = useMemo(
    () => (draft ? { ...draft, budgetAmount: budgetParsed === "invalid" ? draft.budgetAmount : budgetParsed } : null),
    [draft, budgetParsed]
  );
  const changes = bant && effectiveDraft ? changesBetween(bant.answers, effectiveDraft) : {};
  const dirty = Object.keys(changes).length > 0;
  const preview = bant && effectiveDraft ? previewOf(bant.questions, effectiveDraft) : null;

  if (loading && !bant) {
    return (
      <Panel title="BANT Qualification">
        <div className="skeleton" style={{ height: 160, margin: "0 19px 16px" }} aria-busy="true" />
      </Panel>
    );
  }
  if (error && !bant) {
    return (
      <Panel title="BANT Qualification">
        <div style={{ padding: "0 19px 14px" }} role="alert">
          <p style={{ color: "var(--bad)", fontSize: 12.5 }}>Couldn&apos;t load the BANT analysis: {error.message}</p>
          <Button variant="ghost" onClick={refetch}>Retry</Button>
        </div>
      </Panel>
    );
  }
  if (!bant || !draft || !preview) return null;

  async function handleSave() {
    if (budgetParsed === "invalid") return;
    setSaving(true);
    try {
      const view = await save(changes);
      toast.success(
        view.complete
          ? `BANT complete: ${view.score}/100 (${BANT_GRADE_LABEL[view.grade!]}). This lead can now be qualified.`
          : `BANT saved: ${view.score}/100 so far. Still to answer: ${view.missing.join(", ")}.`
      );
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the BANT analysis. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const shownScore = dirty ? preview.score : bant.score;
  const shownGrade = dirty ? preview.grade : bant.grade;
  const answered = dirty ? preview.answered : 4 - bant.missing.length;

  return (
    <Panel title="BANT Qualification">
      <div style={{ padding: "0 19px 6px" }} data-testid="bant-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 700 }} aria-label={`BANT score ${shownScore} out of 100`}>
            {shownScore}
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>/100</span>
          </div>
          {shownGrade ? (
            <Tag color={GRADE_COLOR[shownGrade]}>{BANT_GRADE_LABEL[shownGrade]}</Tag>
          ) : (
            <Tag color="n">{answered} of 4 answered</Tag>
          )}
          {dirty && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Unsaved: the score updates when you save.</span>}
        </div>
        <div className="bar" style={{ marginBottom: 6 }} aria-hidden="true">
          <i style={{ width: `${shownScore}%` }} />
        </div>
        <p style={{ fontSize: 12, color: bant.complete && !dirty ? "var(--good)" : "var(--muted)", margin: "0 0 14px" }}>
          {bant.complete && !dirty
            ? `Complete${bant.completedAt ? ` since ${formatDateTime(bant.completedAt)}` : ""}. This lead can be qualified and handed to Sales.`
            : "Answer all four to qualify this lead and hand it to Sales. Hot 75+, Warm 50–74, Cold below 50."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {bant.questions.map((q) => {
            const noteKey = `${q.key}Note` as const;
            return (
              <fieldset key={q.key} className="choice-row" style={{ display: "block" }} disabled={!canEdit || saving}>
                <legend>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, marginRight: 8,
                      background: "var(--m)", color: "#fff", fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {q.letter}
                  </span>
                  {q.title}: <span style={{ fontWeight: 400, color: "var(--muted)" }}>{q.question}</span>
                </legend>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }} role="radiogroup" aria-label={q.title}>
                  {q.options.map((o) => {
                    const on = draft[q.key] === o.value;
                    return (
                      <label key={o.value} className={`choice${on ? " on" : ""}`} style={{ justifyContent: "space-between" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <input
                            type="radio"
                            name={`bant-${q.key}`}
                            value={o.value}
                            checked={on}
                            onChange={() => setDraft({ ...draft, [q.key]: o.value })}
                          />
                          {o.label}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.points} pts</span>
                      </label>
                    );
                  })}
                  {draft[q.key] && canEdit && (
                    <button
                      type="button"
                      className="iconlink"
                      style={{ alignSelf: "flex-start", fontSize: 11.5 }}
                      onClick={() => setDraft({ ...draft, [q.key]: null })}
                    >
                      Clear answer
                    </button>
                  )}
                </div>
                {q.key === "budget" && (
                  <div style={{ marginTop: 10 }}>
                    <TextField
                      label="Budget amount (₹, optional)"
                      inputMode="decimal"
                      value={budgetText}
                      onChange={(e) => setBudgetText(e.target.value)}
                      placeholder="e.g. 5,00,000"
                      error={budgetParsed === "invalid" ? "Enter an amount in rupees, like 500000 or 5,00,000." : undefined}
                    />
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <TextAreaField
                    label="Notes (optional)"
                    maxLength={500}
                    value={draft[noteKey] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [noteKey]: e.target.value })}
                  />
                </div>
              </fieldset>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "4px 0 14px" }}>
          {canEdit ? (
            <>
              <Button variant="primary" icon="check" onClick={handleSave} disabled={!dirty || saving || budgetParsed === "invalid"}>
                {saving ? "Saving…" : "Save BANT"}
              </Button>
              {dirty && !saving && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft(draftFrom(bant));
                    setBudgetText(bant.answers.budgetAmount == null ? "" : String(bant.answers.budgetAmount));
                  }}
                >
                  Discard changes
                </Button>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{readOnlyReason ?? "You can view this BANT analysis but not change it."}</span>
          )}
        </div>
      </div>
    </Panel>
  );
}
