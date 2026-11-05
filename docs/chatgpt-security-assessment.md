# ChatGPT-Einschätzung zur Security-Checkliste (Selbstauskunft)

Stand: 2026-11-05. Quelle: ChatGPT-Antwort auf die 182-Punkte-Checkliste und die Projektangaben des Betreibers. Die Originalliste liegt als [security-checklist-182.md](./security-checklist-182.md) im Repo. Alles hier ist Selbstauskunft, nicht unabhängig verifiziert.

## Angaben an ChatGPT
SaaS/CRM/Automatisierung/KI-Plattform; Next.js 16, Supabase (Postgres, Auth), Vercel, Azure OpenAI, Resend, Stripe (Testmodus), Google OAuth (Kalender, Gmail), GitHub Actions. Ziel: alles zusammen (ASVS Level 2, DSGVO, ISO-27001-Vorbereitung).

## Einschätzung von ChatGPT
Besonders zu prüfen:
1. Vollständige CSP mit Nonces oder Hashes für Next.js
2. Verschlüsselung und Lebenszyklus der Google-OAuth-Tokens
3. Stripe-Webhooks: Signaturprüfung und Idempotenz
4. Supabase-Service-Role und privilegierte Datenbankfunktionen
5. Automatisierte Backups und Wiederherstellung
6. Vercel-Firewall und verfügbarer DDoS-Schutz (tarifabhängig)
7. Azure-OpenAI-Datenschutz und Prompt-Injection-Schutz
8. DSGVO-Verantwortlichkeit und AVVs

Einordnung: Argon2id lässt sich bei Supabase Auth nicht selbst nachrüsten. WAF/DDoS hängen von Vercel-Funktionen und Tarif ab. Nächster Schritt laut ChatGPT: Abgleich der 182 Einzelanforderungen mit dem Code.

## Verifikation im Code (2026-11-05)
| Punkt | Befund |
|---|---|
| 2 Google-Tokens | AES-256-GCM (`src/lib/integrations/crypto.ts`); Schlüsselrotation nicht dokumentiert |
| 3 Stripe | Signatur per `constructEvent`; Idempotenz siehe Matrix |
| 4 Service-Role | Review siehe Matrix |
| 7 Prompt Injection | siehe Matrix |
| 1, 5, 6, 8 | offen, siehe `post-company-todo.md` |
