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

Current decision record (2026-10-27):

- Release version: closeflow@0.1.0; race-safe lead duplicate change pending deployment
- Date/time: 2026-10-27
- Environment: local code/build checks and local PostgreSQL only; no preview or production mutation in this round
- Incident channel: pending assignment
- Commander: pending assignment
- Engineering approver: pending assignment
- Product approver: pending assignment
- Result: **NO-GO**
- Notes:
	- Passed 2026-10-27: `npm run verify:release`; `npm run test:ai-cost` (16/16); `npm run test:workflow-automations` (3/3); `npm run test:local-lead-duplicates` (5/5).
	- Not run: `npm run test:local-import-export`; local REST/Auth services and required loopback configuration were unavailable.
	- Blocking: duplicate migration and matching app code are not deployed; production migration requires a verified fresh backup and the approved migration path.
	- Blocking: no preview smoke for this change; current Preview URL and bypass configuration are unavailable.
	- Blocking: Stripe Live configuration/payment and complete AI route coverage are not verified; no further paid calls or real charge were authorized in this round.
	- Still required: target schema health, production core smoke, and an observed 24–48-hour monitoring window.

## Remaining Steps to Move NO-GO -> GO

1. Provide a staging clone or explicitly approve a direct Production exception. Before the migration, create and verify a fresh backup; apply the migration through the documented manual path and run the current schema-health check.
2. Deploy the reviewed code to Preview and complete the authenticated duplicate/API and core-flow smoke tests. Apply code to Production only after separate explicit approval.
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