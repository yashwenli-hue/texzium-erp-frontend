// Node module hooks for the frontend tests: resolve extensionless relative imports and the "@/" alias
// to .ts/.tsx files, and transpile those files with the project's TypeScript (JSX via react/jsx-runtime).
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (!/\.tsx?$/.test(url) || !url.startsWith("file:")) return next(url, context);
  const source = await readFile(fileURLToPath(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, sourceMap: false },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
