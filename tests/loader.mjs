// Node module hooks for the frontend tests: resolve extensionless relative imports and the "@/" alias
// to .ts/.tsx files, and transpile those files with the project's TypeScript (JSX via react/jsx-runtime).
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function candidate(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  return null;
}

export async function resolve(specifier, context, next) {
  const local = specifier.startsWith("@/") ? path.join(ROOT, specifier.slice(2))
    : (specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:") ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    : null;
  if (local) {
    const file = candidate(local);
    if (file && /\.tsx?$/.test(file)) return { url: pathToFileURL(file).href, format: "module", shortCircuit: true };
  }
  // "next/navigation" and the like: Next's entry points are plain .js files without an
  // exports map, which Node's ESM resolution does not find without the extension.
  // "next/link" is imported for its default export (the component), which comes out empty
  // when the CommonJS file is loaded through these hooks: it is served by a small ES module
  // that require()s it the ordinary way (default = module.exports, as the build does).
  if (/^next\/[a-z-]+$/.test(specifier)) {
    const file = path.join(ROOT, "node_modules", `${specifier}.js`);
    if (existsSync(file) && specifier === "next/link") return { url: `${pathToFileURL(file).href}?cjs`, format: "module", shortCircuit: true };
    if (existsSync(file)) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith("file:") && url.endsWith(".js?cjs")) {
    const file = fileURLToPath(url.slice(0, -"?cjs".length));
    const source = [
      `import { createRequire } from "node:module";`,
      `export default createRequire(${JSON.stringify(file)})(${JSON.stringify(file)});`,
    ].join("\n");
    return { format: "module", source, shortCircuit: true };
  }
  if (!/\.tsx?$/.test(url) || !url.startsWith("file:")) return next(url, context);
  const source = await readFile(fileURLToPath(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, sourceMap: false },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
