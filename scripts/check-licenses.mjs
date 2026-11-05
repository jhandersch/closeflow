import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Licenses that require source disclosure for a hosted product (copyleft with network clause)
// or that forbid commercial use. Everything else is reported but not blocked.
const BLOCKED = /\b(AGPL|SSPL|BUSL|Commons-Clause|CC-BY-NC)/i;

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const rows = [];

for (const [path, meta] of Object.entries(lock.packages || {})) {
  if (!path || meta.dev || meta.devOptional) continue;
  const manifest = join(path, "package.json");
  if (!existsSync(manifest)) continue;
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  const license = typeof pkg.license === "string" ? pkg.license : pkg.license?.type || (pkg.licenses || []).map((l) => l.type).join(" OR ") || "UNKNOWN";
  rows.push({ name: pkg.name || path, version: pkg.version, license });
}

const counts = {};
for (const row of rows) counts[row.license] = (counts[row.license] || 0) + 1;
console.log(`[licenses] ${rows.length} production packages`);
for (const [license, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${license}: ${n}`);

const blocked = rows.filter((row) => BLOCKED.test(row.license));
const unknown = rows.filter((row) => row.license === "UNKNOWN");
if (unknown.length) console.warn(`[licenses] WARNING: no license field: ${unknown.map((r) => r.name).join(", ")}`);
if (blocked.length) {
  console.error(`[licenses] BLOCKED: ${blocked.map((r) => `${r.name}@${r.version} (${r.license})`).join(", ")}`);
  process.exit(1);
}
console.log("[licenses] No blocked licenses.");
