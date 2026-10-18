// Checks over the pages' own source, for rules that hold across every screen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(p) ? [p] : [];
  });
}
const SOURCES = [...files(path.join(ROOT, "app")), ...files(path.join(ROOT, "components"))].map((p) => ({
  file: path.relative(ROOT, p),
  text: readFileSync(p, "utf8"),
}));

test("every back link is a real link (focusable, opens in a new tab), not a click-only anchor", () => {
  for (const { file, text } of SOURCES) {
    assert.doesNotMatch(text, /<a className="back-link" onClick/, file);
  }
});

test("search results open as links, so they can be reached and opened from the keyboard", () => {
  const search = SOURCES.find((s) => s.file === path.join("app", "search", "page.tsx"))!;
  assert.doesNotMatch(search.text, /onClick=\{\(\) => router\.push/);
  assert.equal((search.text.match(/<Link className="result result-link"/g) ?? []).length, 7);
  assert.match(search.text, /role="status"/);
});
