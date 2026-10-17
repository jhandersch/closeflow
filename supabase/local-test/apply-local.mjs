// Applies the local-only baseline and all migrations to the LOCAL Supabase DB.
// Connects only to 127.0.0.1:54322 (hardcoded; no env/.env.local involved).
import pg from "pg";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const c = new pg.Client({
  host: "127.0.0.1",
  port: 54322,
  user: "postgres",
  password: "postgres",
  database: "postgres",
});

const dir = fileURLToPath(new URL("../migrations/", import.meta.url));
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => {
    const va = BigInt(a.split("_")[0]);
    const vb = BigInt(b.split("_")[0]);
    return va < vb ? -1 : va > vb ? 1 : 0;
  });

await c.connect();
let failed = false;
try {
  await c.query(
    fs.readFileSync(new URL("./baseline.sql", import.meta.url), "utf8")
  );
  console.log("OK   baseline.sql");
  for (const f of files) {
    try {
      await c.query(fs.readFileSync(dir + f, "utf8"));
      console.log(`OK   ${f}`);
    } catch (e) {
      failed = true;
      console.log(`FAIL ${f}: ${e.message}`);
      break;
    }
  }
} finally {
  await c.end();
}
process.exit(failed ? 1 : 0);
