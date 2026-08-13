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

Fill before release:

- Release version: closeflow@0.1.0 (workspace hardening milestone)
- Date/time: 2026-08-04 (latest automated rerun)
- Environment: linked Supabase project `itqzelpofshmzeajvmma` + local app runtime (`http://localhost:3000`)
- Incident channel: pending assignment
- Commander: pending assignment
- Engineering approver: pending assignment
- Product approver: pending assignment
- Result: CONDITIONAL GO
- Notes:
	- Passed (rerun 2026-08-04): `npm run verify:release`
	- Passed (rerun 2026-08-04): `npm run test:cross-tenant:suite`
	- Included in rerun: production build (`npm run build`)
	- Included in rerun: tenancy guard (`npm run lint:tenancy`)
	- Pending manual confirmation in target runtime: execute `supabase/schema-health-check.sql`
	- Pending manual confirmation in target runtime: full UI smoke cycle (lead/task/calendar/pipeline)
	- Pending manual confirmation in target runtime: monitoring window check for no P0/P1 regressions

## Remaining Steps to Move CONDITIONAL GO -> GO

1. Run `supabase/schema-health-check.sql` in the production Supabase target and attach result screenshot/log.
2. Execute full smoke test in production runtime using:
	- `docs/production-smoke-run-2026-08-04.md`
	- Release decision is based on `Layer A - Release Blocking Checks`.
	- `Layer B - Product Maturity Coverage` is recommended and should be tracked, but is not blocking unless explicitly escalated by release commander.
	Evidence requirement:
	- PASS/FAIL for each section
	- Notes for any deviation
	- Timestamped tester and approver fields
3. Observe 24-48h monitoring window with no unresolved P0/P1 signatures.
4. Fill commander/approver fields and flip result to `GO`.

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