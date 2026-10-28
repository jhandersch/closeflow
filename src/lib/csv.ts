import { translateText } from "@/lib/i18n";
export function parseCsvDocument(csv: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      current = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    throw new Error(translateText("CSV contains an unterminated quoted field."));
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    if (row.some((value) => value !== "")) rows.push(row);
  }

  return rows;
}

export function detectCsvDelimiter(header: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (char === '"' && header[index + 1] === '"' && inQuotes) {
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === ",") {
      commas += 1;
    } else if (!inQuotes && char === ";") {
      semicolons += 1;
    }
  }

  return semicolons > commas ? ";" : ",";
}

export function escapeCsvCell(value: unknown): string {
  const text = String(value ?? "");
  const safeText =
    typeof value === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(text)
      ? `'${text}`
      : text;

  if (
    safeText.includes(";") ||
    safeText.includes(",") ||
    safeText.includes("\n") ||
    safeText.includes("\r") ||
    safeText.includes('"')
  ) {
    return `"${safeText.replaceAll('"', '""')}"`;
  }

  return safeText;
}
