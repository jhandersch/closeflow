const SAFE_BASE = "https://closeflow.invalid";

/**
 * Returns a same-origin relative path or null. Rejects protocol-relative
 * ("//host"), backslash variants ("/\host", browsers treat "\" as "/"),
 * control characters and anything that resolves to another origin.
 */
export function sanitizeNextPath(nextPath: string | null | undefined): string | null {
  if (!nextPath || typeof nextPath !== "string") return null;
  if (nextPath.length > 2048) return null;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(nextPath)) return null;

  try {
    const resolved = new URL(nextPath, SAFE_BASE);
    if (resolved.origin !== SAFE_BASE) return null;
  } catch {
    return null;
  }

  return nextPath;
}
