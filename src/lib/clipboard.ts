/** Copy text while preserving the browser's permission decision. */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined" || !document.body) {
    throw new Error("Clipboard access is unavailable in this environment.");
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.style.position = "fixed";
  field.style.opacity = "0";
  field.style.pointerEvents = "none";
  document.body.appendChild(field);

  try {
    field.select();
    if (!document.execCommand("copy")) {
      throw new Error("The browser could not copy the text.");
    }
  } finally {
    field.remove();
  }
}
