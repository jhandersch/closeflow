# CloseFlow Release Acceptance Matrix

Use this matrix for final production release decisions.

## Gate Status Definitions

- GO: All blocking checks pass.
- CONDITIONAL GO: Non-blocking issues exist with approved owner and due date.
- NO-GO: Any blocking gate fails.

## Blocking Gates

1. Build and tenancy integrity
- Command: `npm run verify:release`
- Pass criteria: exit code `0`
- Failure impact: NO-GO

2. Cross-tenant negative suite
- Command: `npm run test:cross-tenant:suite`
- Pass criteria: all negative tests pass for isolation checks
- Failure impact: NO-GO

3. Supabase schema health
- Command: run `supabase/schema-health-check.sql` in target environment
- Pass criteria: no missing required table/column/policy/function, RLS enabled for required tables
- Failure impact: NO-GO

4. Core smoke test
- Scope: lead lifecycle, task lifecycle, calendar lifecycle, pipeline drag/drop
- Pass criteria: all core flows complete without data regressions
- Failure impact: NO-GO

## Non-Blocking Gates

1. Monitoring noise
- Scope: no sustained P2/P3 spikes after smoke run
- Pass criteria: stable error volume and no unknown critical signatures
- Failure impact: CONDITIONAL GO

2. UX polish items
- Scope: minor copy/alignment/spacing issues
- Pass criteria: issues tracked with owner and ETA
- Failure impact: CONDITIONAL GO

## Decision Table

- All blocking gates pass + non-blocking acceptable -> GO
- All blocking gates pass + non-blocking open with owner/ETA -> CONDITIONAL GO
- Any blocking gate fails -> NO-GO

## Release Sign-Off Record

Current decision record (2026-10-28):

- Release version: closeflow@0.1.0; latest Production health version `3e5a97b` (race-safe lead duplicates, invite and workspace-management RLS hardening, viewer read-only UI, stale-workspace fallback)
- Date/time: 2026-10-28
- Environment: local stack, one Preview deployment and Production (marked throwaway fixtures only). Latest Production deployment `closeflow-30ako5mit-jhanderschs-projects.vercel.app` is Ready and aliased to `https://www.closeflowapp.de`; health reports version `3e5a97b`, database/config OK. Monitoring window restarted 2026-10-28 ca. 09:53 CET after this deployment.
- Incident channel: pending assignment
- Commander: pending assignment
- Engineering approver: pending assignment
- Product approver: pending assignment
- Result: **NO-GO** (Production smoke now passes; the new observation window, Stripe Live verification and sign-off remain)
- Notes:
	- Passed 2026-10-28: `npm run verify:release`; extended live app smoke against `www.closeflowapp.de` (ALL PASS, including B17 post-delete and cross-workspace file isolation; fixture cleanup 0 users/0 workspaces); health endpoint reports version `3e5a97b`, database/config OK; immediate 1-hour monitoring snapshot reports zero errors/test leftovers and reachable DB (not the final 24–48-hour observation).
	- Previously passed 2026-10-27/28: `npm run test:ai-cost` (16/16); `npm run test:ai-routes` (6/6); `npm run test:workflow-automations` (3/3); `npm run test:local-lead-duplicates` (5/5); `npm run test:local-import-export` (12/12); `npm run test:local-permissions` (13/13); preview smoke (12/12); schema-health check (0 problems); browser UI run on Production for permissions, workspace switching, mobile, tasks, calendar and invitations.
	- Fixed: invite privilege escalation (20261027020000); workspace management RLS (20261027030000); race-safe duplicate protection (migration 10); viewer read-only UI; stale workspace fallback; mixed locale and language.
	- Done: duplicate migration and app code deployed; preview smoke passed. The file-upload cache-control change and health version field were deployed from the local working tree for this smoke retest; the reported version is the current Git HEAD, not a clean-commit attestation.
	- Blocking: Stripe Live configuration/payment is not verified; it needs live keys, price IDs, the live webhook, an approved amount and a refund procedure. Real paid provider calls are evidenced only for /api/ai/email-generator; the other AI routes are covered by the static contract test.
	- Blocking: observe 24–48 hours after the latest deployment (restarted 2026-10-28 ca. 09:53 CET; run `npm run monitor:snapshot -- 24` and `-- 48`; next cron run in this window is 2026-10-29 06:00 UTC) and capture the final sign-off.
	- Non-blocking, owner only: platform `/admin` check with a platform-admin account, Safari and real devices, OAuth/PKCE and mail deliverability across more providers, weekly backup calendar entry, Vercel bypass secret rotation, Backup/PITR and alerting (Supabase plan).

## Update 2026-11-01 (local gates after Azure OpenAI migration)

- Code: all AI routes migrated to Azure OpenAI (`gpt-4.1-mini`, Global Standard, resource in Germany West Central); no OpenAI fallback; German AI output follows fixed terminology and pipeline stage rules; privacy policy section 6 added; i18n module restored.
- Passed locally: `npm run verify:release`; `test:ai-cost` (16/16), `test:ai-routes` (7/7), `test:csv`, `test:feedback-token`, `test:usage-quota`, `test:workspace-auth`, `test:workflow-automations`, `test:workspace-capacity`.
- Passed: `npm run test:cross-tenant:suite` (7/7 isolation checks; local app against Production with marked fixtures, cleaned up, monitoring shows 0 leftover test users).
- Production: health OK, `monitor:snapshot -- 1` reports no findings; manual live test of the AI routes OK (owner, 2026-11-01).
- Open: monitoring window (`-- 24` on 2026-11-02 21:00, `-- 48` on 2026-11-03 21:00), Stripe Live and legal page details (blocked until the company exists), Azure price check against the official page, sign-off.
- Done 2026-11-01: Azure prices verified against the official Azure Retail Prices API (Germany West Central, gpt-4.1-mini Global Standard: 0.40 USD input / 1.60 USD output per 1M tokens; matches the configured values). Data Zone would be 0.44 / 1.76 USD per 1M tokens.
- Done 2026-11-01: Azure budget `closeflow-monatlich` (20 EUR/month, email alerts at 50% and 100%, owner-configured; alerts only, no spending cap).
- Done 2026-11-01: Google integration (Gmail send, Calendar create and manual import) built and live-tested by the owner in Production (mail arrived via Gmail, calendar import worked). Slack was built and removed again. Setup in `docs/integrations-setup.md`. Pushes on this day restarted the monitoring window. Privacy policy still needs a Google section (legal, after company formation); Google app verification is needed for users beyond the 100 unverified-user limit.
- Done 2026-11-01: Maintenance mode (`MAINTENANCE_MODE`, `docs/maintenance-mode.md`) enabled in Production; all pages and `/api/**` return 503 except `/api/health`, `/api/cron/*` and the Stripe webhook.
- Done 2026-11-03: Monitoring window closed without findings. `monitor:snapshot -- 24` (2026-11-02) and `-- 48` (2026-11-03): health 200, 0 error events, database reachable, 0 leftover test users. The only warning (`/login` 503) is the intended maintenance mode. Note: no real user traffic during the window (app locked), so it shows idle stability only. Overall status stays NO-GO (company formation, legal texts, Stripe Live, Google verification).

- Done 2026-11-05: Notifications and automations. Unit tests `test:workflow-automations` (5/5) and new `npm run test:automations-e2e` (local app against Production Supabase, marked fixtures, cleaned up) pass: `lead.created` creates a task and notification, `lead.stage.contacted` notifies, `lead.status.update` sets the status with a timeline entry and no loop, `task.overdue` notifies, repeated loads do not duplicate. Browser check: sidebar counter shows unseen items and resets after opening Notifications, also after reload. Privacy policy section 7 covers email notifications. NOT verified: Vercel cron runs and delivery from the own sender domain. Done 2026-11-05: email delivery verified locally (cron `/api/cron/notifications` with consent: 1 email sent via Resend from `onboarding@resend.dev`, arrived in the inbox; second run sent 0, no duplicate; request without secret returns 401; consent and test data restored afterwards). Still needs the maintenance mode lifted or a Preview deployment: Vercel cron execution, `EMAIL_FROM` with a verified domain.

- Done 2026-11-05: Security hardening. Security review found one issue (platform admin by unconfirmed email), fixed in `src/lib/platformAdmin.ts` (confirmed email required, MFA kept). Security headers (HSTS, nosniff, frame-ancestors, referrer, permissions) in `next.config.ts`; `npm audit` for production dependencies: 0 (zod fixed; 8 moderate remain in dev tooling only); Dependabot configured; rate limits added for recovery-code verification and error reports; unused `/api/debug-auth` removed; request body limit (1 MB, 413) in `src/proxy.ts` with `test:input-limits` (3/3); email templates escape user text, no user-controlled `dangerouslySetInnerHTML`. Incident plan: `docs/incident-plan.md`. Open: full `script-src` CSP (needs nonces and browser tests), per-field length limits in the database (needs migration approval), header check on the deployed app (after maintenance mode), owner tasks (2FA on all portals, GitHub secret scanning, Supabase "Confirm email", - Done 2026-11-05: Audit trail. `src/lib/auditLog.ts` writes append-only entries to `audit_logs` (service role; no update/delete policy; credential-like keys dropped, strings capped) for role changes, member removal, invite created/revoked/accepted, lead/customer exports, automation create/update/delete, plan changes and Google disconnect. Read access: `GET /api/audit-logs` (owner/admin only), shown under Settings > Monitoring. Unit test `tests/audit-log.test.mjs`. NOT verified against the live database in a browser. Limits: logins only in Supabase Auth logs, platform-admin actions have no workspace and are not logged, logs are removed with the workspace.

- Done 2026-11-05: Error alerting. Daily Vercel cron `/api/cron/alerts` (07:30, Bearer `CRON_SECRET`) emails `CLOSEFLOW_ALERT_EMAIL` when `error.*` events in 24 h reach `CLOSEFLOW_ALERT_ERROR_THRESHOLD` (default 25); mail has counts only. Spike logic unit-tested (`test:alerting`, 3/3). Uptime alerts already come from the 15-minute GitHub health check. NOT verified: cron run on Vercel and email delivery (needs both env vars set in Vercel). Failed logins are not alerted by the app; use the Supabase Auth logs.## Remaining Steps to Move NO-GO -> GO

- Done 2026-11-05: CSRF and SSRF review. SSRF: all server-side outbound requests go to fixed hosts (Google APIs, Resend, own origin for the demo seed); redirects use fixed paths; no user-supplied URLs are fetched. CSRF: Google OAuth state is signed and bound to the user; new cross-site write check in `src/proxy.ts` (`src/lib/csrf.ts`: `Sec-Fetch-Site: cross-site` or foreign `Origin` on POST/PUT/PATCH/DELETE to `/api` returns 403; bearer calls, Stripe webhook and cron exempt). `test:csrf` (3/3); checked locally with curl (cross-site 403, same-origin reaches auth 401). NOT browser-tested with the full UI flow.## Remaining Steps to Move NO-GO -> GO
1. DONE 2026-10-27: migrations applied to Production (direct exception, no staging clone; schema-health 0 problems).
2. DONE 2026-10-27: code deployed, Preview smoke and live app smoke pass.
3. DONE 2026-10-28: execute the extended release smoke test in Production, including B17 file deletion and cross-workspace isolation:
	- `docs/production-smoke-run-2026-08-04.md`
	- Result: ALL PASS after the latest deployment; marked fixtures cleaned (0 users/0 workspaces). B17 failure before deployment was retested successfully after cache-control was deployed.
4. Configure and verify Stripe Live only after the owner confirms the live amount and refund procedure; capture webhook delivery evidence.
5. Observe a 24–48-hour monitoring window with no unresolved P0/P1 signatures.
6. Fill commander/approver fields and change the result to `GO` only when every blocking gate is evidenced.

## Manual Evidence Artifacts

- Schema health SQL output (screenshot/log)
- Completed smoke protocol: `docs/production-smoke-run-2026-08-04.md`
- Monitoring window summary (P0/P1 count, API error rate, auth/db anomalies)

## GO Promotion Rule

Promote `Result` from `CONDITIONAL GO` to `GO` only when all are true:
- Schema health: PASS
- Production smoke protocol: PASS
- Monitoring window: PASS

Keep `CONDITIONAL GO` if any required evidence artifact is missing.

## Final Production Approval Block

- Production approved: YYYY-MM-DD
- Approved by: <name>
- Commander: <name>
- Incident channel: <channel>