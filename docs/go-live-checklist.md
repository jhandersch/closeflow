# CloseFlow Go-Live Checklist

This checklist is the final release gate for production readiness.

## 1) Build and Static Gates

Run from project root:

```bash
npm run verify:release
```

Expected result:
- Tenancy guard passes.
- Production build passes.

## 2) Supabase Migration Rollout

Apply migrations in order in the target environment.

Required files:
- `supabase/migrations/20260713_team_workspace.sql`
- `supabase/migrations/20260716_closeflow_revenue_os_foundation.sql`
- `supabase/migrations/20260717_mfa_recovery_codes.sql`
- `supabase/migrations/20260719_calendar_activity_foundation.sql`
- `supabase/migrations/20260720_core_crm_rls_hardening.sql`

After rollout, run in SQL editor:
- `supabase/schema-health-check.sql`

If legacy metadata migration is needed, run:
- `supabase/backfill-team-metadata.sql`

## 3) Core Functional Smoke Tests

1. Lead lifecycle
- Create lead, update status, add note, delete lead.
- Confirm timeline entries exist and remain consistent.

2. Calendar lifecycle
- Create meeting event, update event, mark completed, delete event.
- Hard refresh calendar; deleted event must not reappear.

3. Task lifecycle
- Create task, complete task, reopen if supported.
- Confirm related activity entries are present once (no duplicates).

4. Pipeline integrity
- Drag one lead across at least 2 stages.
- Confirm stage and `stage_changed_at` update.

## 4) Cross-Tenant Negative Tests (Blocking)

Use two users in different workspaces: `UserA` in `WorkspaceA`, `UserB` in `WorkspaceB`.

Automated execution (recommended):

```bash
npm run test:cross-tenant
```

The command uses env vars defined in `scripts/cross-tenant-negative-tests.js --help`.

Seed WorkspaceB probe data automatically:

```bash
npm run test:cross-tenant:seed
```

Run full suite (seed + tests):

```bash
npm run test:cross-tenant:suite
```

Prepare:
- Create at least one lead/event/task in each workspace.
- Capture resource IDs for both users.

Run these checks with `UserA` token/cookie:

1. Search isolation
- `GET /api/search?q=<WorkspaceB lead/company keyword>`
- Expected: no results from `WorkspaceB`.

2. Lead score isolation
- `POST /api/leads/<WorkspaceB leadId>/score`
- Expected: `404` or no data.

3. Next action isolation
- `POST /api/leads/<WorkspaceB leadId>/next-action`
- Expected: `404` or no data.

4. Calendar update isolation
- `PUT /api/calendar/events` with `id=<WorkspaceB eventId>`
- Expected: `404`/`403` and no modification.

5. Calendar delete isolation
- `DELETE /api/calendar/events?id=<WorkspaceB eventId>`
- Expected: `404`/`403` and event still exists for `UserB`.

6. Export isolation
- `GET /api/leads/export` and `GET /api/customers/export`
- Expected: exports contain only `WorkspaceA` data.

## 5) Monitoring and Security Validation

1. Error monitoring
- Trigger a controlled API error and verify an entry appears in monitoring view.

2. MFA-sensitive flows
- Verify account deletion path requires expected confirmation and auth strength.

3. Usage limits
- Verify AI/export limits return correct status and messages when exceeded.

## 6) Release Decision

Release is approved only if all are true:
- `npm run verify:release` passes.
- Migration and schema health checks pass in production target.
- All cross-tenant negative tests pass.
- `docs/production-smoke-run-2026-08-04.md` is fully completed and marked PASS.
- No P0/P1 errors in monitoring during smoke test window.

Use final decision matrix:
- `docs/release-acceptance-matrix.md`

Fast path runbook:
- `docs/final-2-percent-runbook.md`