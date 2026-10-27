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

- Release version: closeflow@0.1.0 at commit 138aa64 (race-safe lead duplicates, invite and workspace-management RLS hardening, viewer read-only UI, stale-workspace fallback)
- Date/time: 2026-10-28
- Environment: local stack, one Preview deployment and Production (only marked throwaway fixtures); monitoring window restarted 2026-10-27 ca. 23:57 CET (Production deploy closeflow-6uhqzdime)
- Incident channel: pending assignment
- Commander: pending assignment
- Engineering approver: pending assignment
- Product approver: pending assignment
- Result: **NO-GO** (only the observation window, Stripe Live and the sign-off remain)
- Notes:
	- Passed 2026-10-27/28: `npm run verify:release`; `npm run test:ai-cost` (16/16); `npm run test:ai-routes` (6/6); `npm run test:workflow-automations` (3/3); `npm run test:local-lead-duplicates` (5/5); `npm run test:local-import-export` (12/12); `npm run test:local-permissions` (13/13); live app smoke against closeflow-green.vercel.app (ALL PASS after the last deploy); preview smoke (12/12); schema-health check (0 problems); browser UI run on Production for permissions, workspace switching, mobile, tasks, calendar and invitations.
	- Fixed: invite privilege escalation (20261027020000); workspace management RLS (20261027030000); race-safe duplicate protection (migration 10); viewer read-only UI; stale workspace fallback; mixed locale and language.
	- Done: duplicate migration and app code deployed; preview smoke passed.
	- Blocking: Stripe Live configuration/payment is not verified; it needs live keys, price IDs, the live webhook, an approved amount and a refund procedure. Real paid provider calls are evidenced only for /api/ai/email-generator; the other AI routes are covered by the static contract test.
	- Blocking: observed 24–48-hour monitoring window (restarted 2026-10-27 ca. 23:57 CET; run `npm run monitor:snapshot -- 24` and `-- 48`; the first cron run is 2026-10-28 06:00 UTC) and the final sign-off.
	- Non-blocking, owner only: platform `/admin` check with a platform-admin account, Safari and real devices, OAuth/PKCE and mail deliverability across more providers, weekly backup calendar entry, Vercel bypass secret rotation, Backup/PITR and alerting (Supabase plan).

## Remaining Steps to Move NO-GO -> GO

1. DONE 2026-10-27: migrations applied to Production (direct exception, no staging clone; schema-health 0 problems).
2. DONE 2026-10-27: code deployed, Preview smoke and live app smoke pass.
3. Execute the remaining release smoke test in the approved target runtime using:
	- `docs/production-smoke-run-2026-08-04.md`
	Evidence requirement:
	- PASS/FAIL for each section
	- Notes for any deviation
	- Timestamped tester and approver fields
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