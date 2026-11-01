import { existsSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const tryResolve = (base) => {
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
};

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith("@/")) {
    base = path.join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.includes("/src/") && !path.extname(specifier)) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const resolved = base && tryResolve(base);
  if (resolved) return { url: resolved, shortCircuit: true };
  return nextResolve(specifier, context);
}

if (import.meta.url && !globalThis.__tsAliasLoaderRegistered) {
  globalThis.__tsAliasLoaderRegistered = true;
  register(import.meta.url);
}
