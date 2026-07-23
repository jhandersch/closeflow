# CloseFlow Final 2 Percent Runbook

This runbook executes the final blocking gate in production-like conditions.

## 1) Prepare environment variables

Reference template:
- [.env.cross-tenant.example](.env.cross-tenant.example)

PowerShell example:

```powershell
$env:BASE_URL = "https://your-closeflow-domain.example"
$env:USER_A_BEARER_TOKEN = "<token-user-a-workspace-a>"
$env:USER_B_BEARER_TOKEN = "<token-user-b-workspace-b>"
```

Automated bootstrap (creates two temporary users and workspaces):

```bash
npm run test:cross-tenant:bootstrap
```

If bootstrap fails with:
- "workspace schema missing"

apply migration first:
- `supabase/migrations/20260716_closeflow_revenue_os_foundation.sql`

If Supabase CLI is not linked/authenticated, run:

```bash
npx supabase login
npx supabase link --project-ref itqzelpofshmzeajvmma
npx supabase migration up
```

## 2) Run technical release gate

```bash
npm run verify:release
```

Expected:
- tenancy guard passes
- production build passes

## 3) Run cross-tenant full suite

```bash
npm run test:cross-tenant:suite
```

Expected:
- WorkspaceB probe lead and event are seeded
- all negative checks pass for UserA against WorkspaceB resources

## 4) Final decision

Open and fill:
- [docs/release-acceptance-matrix.md](docs/release-acceptance-matrix.md)

Release can be marked GO only when:
- verify:release passed
- cross-tenant suite passed
- schema health checks passed in target database
- smoke tests passed