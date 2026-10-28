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

## Remaining Steps to Move NO-GO -> GO

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