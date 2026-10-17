import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Hint, timestamp and placeholder text uses --faint-text, which must stay readable
// (WCAG AA, at least 4.5:1) on every surface and canvas in both themes. --faint itself is
// for borders, dots and dividers only and must not colour text.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

const hex = (h: string) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** The value of a token in the first block that defines it after `from`. */
const token = (name: string, from = 0) => {
  const m = css.slice(from).match(new RegExp(`--${name}:(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `--${name} defined`);
  return m[1];
};

test("faint text is at least 4.5:1 on every surface and canvas, light and dark", () => {
  const dark = css.indexOf(':root[data-theme="dark-v4"]');
  assert.ok(dark > 0, "the dark theme block exists");
  for (const [theme, at] of [["light", 0], ["dark", dark]] as const) {
    const fg = token("faint-text", at);
    for (const bg of ["surface", "canvas"]) {
      const r = ratio(fg, token(bg, at));
      assert.ok(r >= 4.5, `${theme}: --faint-text on --${bg} is ${r.toFixed(2)}:1`);
    }
  }
});

test("--faint never colours text, in the stylesheet or in inline styles", () => {
  assert.equal(css.match(/(?<![-\w])color:var\(--faint\)/g)?.length ?? 0, 0, "globals.css");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && /(?<![-\w])color: "var\(--faint\)"|fg: "var\(--faint\)"/.test(readFileSync(p, "utf8"))) offenders.push(path.relative(ROOT, p));
    }
  };
  for (const d of ["app", "components"]) walk(path.join(ROOT, d));
  assert.deepEqual(offenders, []);
});
