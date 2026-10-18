/** An action a "Next up" button hands back to its page; `open` is a plain link the panel handles itself. */
export type OpenAction = { type: "open"; href: string };

/** One thing a record needs: what is true, and the existing action for it (with the reason when it can't be used). */
export interface NextUpItem<A extends { type: string } = { type: string }> {
  key: string;
  tone: "bad" | "warn" | "action" | "info" | "good";
  title: string;
  detail?: string;
  cta?: { label: string; action: A | OpenAction; enabled: boolean; reason?: string };
}
