import { NextStep } from "../../lib/repository/shared/commercialChain";

/** The "what happens next" cell of the quotation and Proforma lists. */
export function NextStepCell({ step }: { step: NextStep }) {
  return <span className={`nextstep ${step.tone}`}>{step.label}</span>;
}
