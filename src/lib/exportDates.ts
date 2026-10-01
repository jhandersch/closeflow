const DEFAULT_EXPORT_TIMEZONE = "Europe/Berlin";
const EXCEL_DATE_FORMAT = "yyyy-mm-dd hh:mm";

export function resolveExportTimezone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_EXPORT_TIMEZONE;

  const timezone = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_EXPORT_TIMEZONE;
  }
}

function getZonedDateParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}

export function getExportDateKey(value: Date, timezone: string) {
  const parts = getZonedDateParts(value, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatCsvTimestamp(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  // The explicit UTC marker keeps spreadsheet apps from auto-formatting
  // a narrow CSV column as a date and displaying it as ####.
  return date.toISOString();
}

export function getExcelDateCell(value: unknown, timezone: string) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = getZonedDateParts(date, timezone);
  const localWallClock = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const excelEpoch = Date.UTC(1899, 11, 30);

  return {
    value: (localWallClock - excelEpoch) / 86_400_000,
    numberFormat: EXCEL_DATE_FORMAT,
  };
}
