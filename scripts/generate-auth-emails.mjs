// Generates the Supabase Auth email templates from src/lib/email-templates.ts.
// Usage: node scripts/generate-auth-emails.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authEmailKinds, buildSupabaseAuthTemplate } from "../src/lib/email-templates.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "supabase", "templates");
mkdirSync(outDir, { recursive: true });

const toml = [];
for (const kind of authEmailKinds) {
    const { subject, html } = buildSupabaseAuthTemplate(kind);
    writeFileSync(join(outDir, `${kind}.html`), html);
    toml.push(
        `[auth.email.template.${kind}]`,
        `subject = ${JSON.stringify(subject)}`,
        `content_path = "./supabase/templates/${kind}.html"`,
        "",
    );
}
console.log("Templates written to supabase/templates. config.toml block:\n\n" + toml.join("\n"));
