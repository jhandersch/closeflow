# CloseFlow Production Smoke Run

Purpose: record manual and automated evidence used for the CloseFlow release decision.

Latest recorded production interactions include the explicitly authorized migration and marker-scoped fixtures documented below, one separately authorized successful AI-provider request, and the authenticated browser UI smoke run dated 2026-10-15. No deployment, real Stripe charge, or live email delivery was performed as part of that UI run. Older audit sections below are timestamped historical snapshots; the latest evidence sections supersede earlier status statements.

## Status Update 2026-10-24 (domain, auth, WIP mode)

Current decision: **NO-GO (unchanged)**. The app is deliberately held back by a work-in-progress placeholder (`src/proxy.ts`, commit `0cedb38`). Verified live with `curl`: `/login` returns 503 with the placeholder, `/api/health` returns 200. The bypass cookie and `WIP_MODE=off` were not tested.

Done and evidenced:

- Domain `closeflowapp.de` with `www` as canonical; the apex redirects with 308. Both are valid in Vercel. `NEXT_PUBLIC_SITE_URL` is set to `https://www.closeflowapp.de` and was redeployed.
- IONOS mailboxes, SPF/DKIM/DMARC PASS, Supabase custom SMTP configured.
- Password reset including the MFA (AAL2) step fixed and confirmed by the owner (commits `d3da8d1`, `2668b99`).
- Google OAuth: branding URLs, authorized domains, developer contact, publishing status "In Produktion"; client origin and Supabase callback are correct. The user-support email is still a freenet address (Google allows only a Google account or group).
- Supabase redirect URLs added for `https://www.closeflowapp.de/**` and `/auth/callback`.
- Stripe test webhook moved to `https://www.closeflowapp.de/api/stripe/webhook`; an unsigned POST returns 400 as expected.
- Health check workflow points at the new domain.
- Backups: second copy on a BitLocker-encrypted stick verified (see `docs/backup-restore.md`).

Still open (blocking):

- Update 2026-10-24 (later): the WIP placeholder was reverted (`3c68b59`); the site is public again, new signups stay blocked in Supabase ("Allow new users to sign up" off). Verified live by the owner: Google login, magic link across browsers, signup confirmation mail and password reset mail (German templates from `support@closeflowapp.de`, `token_hash` links, callback commit `bda8f6c`). Re-enable signups at go-live.
- Update 2026-10-24 (E, live, narrow/mobile viewport 526px, owner-authenticated session): onboarding (workspace + first lead) completes and lands on the dashboard; `/dashboard`, `/leads`, `/customers`, `/calendar`, `/tasks`, `/settings`, `/billing`, `/pricing` return 200 with no horizontal overflow and no console errors; the first lead and the Free plan usage (1/50 leads, 0/10 AI, 0/5 exports, 1/1 seats) display correctly. Not yet verified: file upload/download/delete (automated upload was inconclusive), roles, workspace switch isolation, DE/EN consistency, Safari.
- Update 2026-10-24 (mail sender): Resend domain `closeflowapp.de` (EU/Ireland) is verified (DKIM `resend._domainkey`, SPF/MX on `send`, set in IONOS; mailbox DNS untouched). Vercel Production now has `EMAIL_FROM` and `RESEND_API_KEY`. Invite mail delivery is not yet tested live: the Free workspace has a 1-seat limit, so the invite form does not open; a Pro (Stripe test) workspace is needed. Roles and workspace-switch tests depend on that.
- Update 2026-10-24 (invite mail live): on a Pro (Stripe test) workspace the invite is created and the mail from `support@closeflowapp.de` via Resend is **delivered** to `support@closeflowapp.de`. An invite to an iCloud address bounced (`554 5.7.1 Command rejected`, likely sender reputation of the new domain; not confirmed). Re-test with Gmail/GMX/Outlook and watch iCloud deliverability before launch. Accepting the invite and role/workspace-switch checks are still open.
- Update 2026-10-24 (signups live, member role): Supabase signups are now ON (`disable_signup=false`), the site is public. Invite accept works only for the invited address (wrong email → 403, intended). As Member of a Pro workspace: `/billing` shows "Access restricted", `/admin` returns Forbidden, sidebar has no Billing/Admin. Server enforcement verified live: invite → 403 (2FA required), update-role → 403 (owners/admins only), remove-member → 403, delete workspace → 403. Minor UX: the Team page still shows enabled role/Remove controls to Members (server blocks the action). Open: Owner-side removal, file upload/download/delete (manual). Owner role change verified live (Member→Viewer: 200, "Role updated"). Finding: Pending invites list shows no revoke/cancel button (UX gap). Isolation checked live: as Member, switching to own Free workspace shows only its own lead (`jdvs cxhu`), none of "E2E Testfirma" (leads, customers, tasks, files all separate).
- Plan limits, import lock, atomic seat check on invite accept, AI quota on all AI routes and `/api/health` DB check were found already implemented in code (not re-tested live). `npm run lint`: 0 errors, 125 warnings.
- Invite mails use Resend with sender `onboarding@resend.dev` unless `EMAIL_FROM` is set; the sender domain must be verified in Resend before go-live.
- No business, Impressum or real legal data yet. `impressum` and `datenschutz` still contain placeholders and must be replaced and reviewed before launch.
- Practical tests of Google login, registration mail, magic link and a full password-reset on the live domain (requires the WIP bypass).
- Stripe Live: keys, price IDs, live webhook and a live payment test with refund.
- Global duplicate lock for concurrent import and manual create.
- Direct Supabase signup is still possible; disable "Allow new users to sign up" while in WIP.
- Backup follow-ups: off-site storage of the second stick, separate BitLocker recovery key, recurring reminder.

This document is intentionally split into two layers:

- Layer A (Release Blocking): mandatory for release decision.

- Layer B (Product Maturity): strongly recommended for ongoing hardening.

## Repository Audit Snapshot (2026-10-14T17:08:55+02:00)

Audit record timestamp (local): **2026-10-14T17:08:55+02:00**. Individual command start/end wall-clock times were not retained by the execution tools.

### Result at this snapshot

**NO-GO for production promotion based on repository evidence.** The local production build and `npm run verify:release` passed, but `npm run lint` failed with 15 errors and 124 warnings. The cross-tenant suite and live schema check were not run: the cross-tenant bootstrap creates Supabase users, workspaces, leads, and calendar events, and no isolated disposable target was authorized. Security, billing, auth recovery, database state, monitoring, deployment, and recovery therefore have no current live evidence.

High-priority code findings:

- `/api/ai/email-rewrite` and `/api/follow-up-ai/forecast-ai` were unauthenticated and unmetered. Both now require a signed-in user/workspace and check the existing AI quota. Email rewrite validates its tone and limits input to 12,000 characters; forecast validates its input shape/size and lead count. Both return explicit configuration/provider errors instead of success-shaped fallbacks. Their shared quota helper remains non-atomic and can fail open; that shared defect is not fixed by these route changes.
- The shared usage helper reads counters and then upserts them non-atomically, defaults failed usage reads to zero, and does not surface failed counter writes. Concurrent or failed requests can exceed limits or undercount usage.
- Explicit monthly AI quota checks are present in only `/api/ai/chat`, `/api/sales-copilot`, `/api/revenue-forecast-ai`, `/api/ai/email-rewrite`, and `/api/follow-up-ai/forecast-ai`. The other AI endpoints in the registry below require a path-by-path enforcement review; the published allowance is not proven across all AI features.
- Lead capacity is checked by the main lead API and demo seeding, but no check is present in the lead CSV import route. Team seat checks occur when an invite is created, but invite acceptance does not re-check the seat cap. Capacity and seat checks are read-then-write and not race-safe.
- `src/lib/rateLimit.ts` is an in-memory process-local map and its only discovered API call site is lead creation. It is not a distributed production rate limiter for AI, imports, or other sensitive routes.
- `supabase/schema-health-check.sql` previously checked the legacy `organizations` model, not the current workspace-first schema. It now includes current workspace tables, columns, RLS, policies, functions, and private file-storage checks. It still needs to be run against the intended Supabase target before release.
- The existing cross-tenant suite checks a narrow set of read/update/delete/export cases, not every tenant resource or operation. It bootstraps data without cleanup, so it must only be run against a disposable authorized test project.

### Inventory-to-smoke matrix

| Function | Code paths / endpoints | Database dependencies | Tests | Result | Evidence / next action |
|---|---|---|---|---|---|
| Build and runtime | `package.json`, `next.config.ts`, `src/app/**`, `src/lib/**` | Supabase client config at runtime | `npm run build`; `npm run verify:release` | Build PASS; release script PASS | Local only, 2026-10-14; see gate results below |
| Lint and type checking | ESLint 9, TypeScript 5, `eslint.config.mjs`, `tsconfig.json` | None | `npm run lint`; build type phase | Lint FAIL; build type phase PASS | ESLint reported 15 errors / 124 warnings; triage before release |
| Auth, session, callback | `(auth)/login`, `auth/callback`, `AuthGuard`, `src/lib/supabase/{server,route,middleware}.ts`, `/api/profile`, `/api/security/recovery-codes/*`, `/api/debug-auth` | Supabase Auth, `profiles`, `mfa_recovery_codes` | No unit/E2E auth tests found; historical manual checks only | Partially inspected; not live-tested | Signup, confirmation, reset, invalid/expired sessions, MFA recovery, browser deep links remain manual release checks |
| Workspaces, roles, invitations | `/api/workspaces/*`, `useTeamWorkspace`, `workspaceAuth.ts` | `workspaces`, `workspace_members`, `workspace_invites`, subscriptions | Cross-tenant suite: limited negative probes | Partial; live suite not run | Role/seat/acceptance matrix and invitation replay/expiry tests remain open |
| Leads, pipeline, customers | `/api/leads*`, `/api/customers/import`, pages under `(dashboard)/leads`, `pipeline`, `customers` | `leads`, `customers`, `activities`, `tasks`, `calendar_events`, `lead_scores`, `lead_memory`, `revenue_events` | No unit/integration/E2E tests found | Partially inspected; not live-tested | Lifecycle, duplicate import, exactly-once stage activities, restore, concurrency and partial failure require isolated DB tests |
| Tasks, calendar, activities | `/api/activity`, `/api/calendar/events*`, `/api/automations`, dashboard task/calendar hooks | `tasks`, `calendar_events`, `activities`, `automations`, `automation_runs` | Cross-tenant probes only cover calendar update/delete | Partial | Time-zone/DST, restore, task cascade and retry idempotency are not verified |
| AI and sales assistance | 19 AI-related API handlers listed below; `src/lib/{ai,openai,salesCopilot,forecast,aiCost}.ts` | Workspace CRM data, `ai_conversations`, `usage` | No provider-mocked or quota tests found | Not release-ready | Verify auth, workspace ownership, quota coverage, spend logging, provider failure and response schemas for every endpoint |
| Plans and usage | `planDetails.ts`, `usageLimits.ts`, `/api/usage`, lead/invite/export/AI handlers | `subscriptions`, `usage`, `workspace_members`, `workspace_invites`, `leads` | No limit-boundary or concurrency tests found | Blocker | Counters are fail-open/non-atomic; several AI/import/invite paths bypass limits |
| Billing and Stripe | `/api/stripe/{create-checkout,create-portal,change-plan,webhook}`, `/api/billing` | `subscriptions`, `workspaces` | No Stripe test-mode or webhook tests found | Partially inspected; not exercised | UI prices are code-defined; configured Stripe price objects, lifecycle events, duplicate/out-of-order webhooks, failed payments and cancellation effects remain unverified |
| Import, export, files | `/api/leads/{import,export}`, `/api/customers/{import,export}`, `/api/files` | `leads`, `customers`, `usage`, `storage.objects`, `storage.buckets` | Cross-tenant suite checks export marker only | Partial | Import validation/atomicity, size limits, formula injection, file policy, export caps, and DB-state assertions remain open |
| Admin, monitoring, feedback | `/api/admin/*`, `/api/monitoring/errors`, `/api/feedback`, settings pages | Admin/auth metadata, error records, feedback data | No automated tests found | Partially inspected; not live-tested | Admin-role and personal-data access checks plus monitoring delivery require manual and negative tests |
| Health, deployment, backup | `/api/health`, `next.config.ts`, scripts, Supabase SQL/docs | Health is application-only; Supabase storage/database configuration external | No deployment/recovery automation or live health test run | Open | `/api/health` returns a timestamp and `"ok"` without checking Supabase/provider dependencies; backup/restore and deployment config must be evidenced externally |
| Product positioning and UX | `src/app/page.tsx`, `src/app/pricing/page.tsx`, `(dashboard)/**`, `planDetails.ts`, `i18n.ts` | Plan configuration | Build only; no accessibility/mobile/browser tests found | Partial | Public copy remains mostly English; German agency hypothesis and message “damit keine Verkaufschance vergessen wird” are not consistently reflected in-product or market-validated |

### Route and method registry

The inventory found 64 API `route.ts` files. HTTP methods are taken from exported handlers, not inferred from pages.

| Area | Endpoints and methods |
|---|---|
| Activity / automation | `/api/activity` GET, POST; `/api/activity-ai` POST; `/api/automations` GET, POST, PATCH, DELETE |
| Admin / monitoring | `/api/admin/overview` GET; `/api/admin/users` GET; `/api/monitoring/errors` GET, POST |
| AI | `/api/ai/chat` POST; `/api/ai/email-generator` POST; `/api/ai/email-rewrite` POST; `/api/ai/lead-score` POST; `/api/ai/meeting-prep` POST; `/api/ai-insight` POST; `/api/follow-up-ai` POST; `/api/follow-up-ai/forecast-ai` POST; `/api/lead-memory-ai` POST; `/api/priority-ai` POST; `/api/priority-analysis` POST; `/api/revenue-forecast-ai` POST; `/api/sales-copilot` POST |
| Billing / Stripe | `/api/billing` GET; `/api/stripe/change-plan` POST; `/api/stripe/create-checkout` POST; `/api/stripe/create-portal` POST; `/api/stripe/webhook` POST |
| Calendar / dashboard | `/api/calendar/events` GET, POST, PUT, DELETE; `/api/calendar/events/restore` POST; `/api/dashboard/forecast` GET |
| Customers / files | `/api/customers/export` GET; `/api/customers/import` POST; `/api/files` GET, POST, DELETE |
| Leads | `/api/leads` GET, POST, PUT, PATCH, DELETE; `/api/leads/export` GET; `/api/leads/import` POST; `/api/leads/search` GET; `/api/leads/trash` DELETE; `/api/leads/[id]/ai-analysis` POST; `/api/leads/[id]/email` POST; `/api/leads/[id]/follow-up-ai` POST; `/api/leads/[id]/next-action` POST; `/api/leads/[id]/score` POST |
| Identity / profile / security | `/api/debug-auth` GET; `/api/me/permissions` GET; `/api/notifications` GET; `/api/profile` GET, PATCH; `/api/profile/avatar` PATCH; `/api/profile/delete` POST; `/api/profile/preferences` PATCH; `/api/security/recovery-codes/regenerate` POST; `/api/security/recovery-codes/status` GET; `/api/security/recovery-codes/verify` POST |
| Other app APIs | `/api/demo/seed` POST; `/api/feedback` GET, POST; `/api/health` GET; `/api/onboarding` POST; `/api/search` GET; `/api/usage` GET |
| Workspaces | `/api/workspaces` GET; `/api/workspaces/create` POST; `/api/workspaces/delete` POST; `/api/workspaces/invite` POST; `/api/workspaces/invite/accept` POST; `/api/workspaces/members` GET; `/api/workspaces/remove-member` POST; `/api/workspaces/update-role` POST |

### Page and layout registry

The build reports 37 user-facing page routes. Shared layouts are `src/app/layout.tsx` and `src/app/(dashboard)/layout.tsx`; the dashboard layout applies `AuthGuard`. The route set is:

`/`, `/activities`, `/admin`, `/ai`, `/agb`, `/analytics`, `/analytics/revenue`, `/automations`, `/billing`, `/calendar`, `/cookies`, `/costs`, `/customers`, `/customers/[id]`, `/dashboard`, `/datenschutz`, `/demo`, `/feedback`, `/feedback/[workspaceId]`, `/files`, `/forecast`, `/impressum`, `/leads`, `/leads/[id]`, `/login`, `/notifications`, `/onboarding`, `/pipeline`, `/pricing`, `/search`, `/settings`, `/settings/billing`, `/settings/monitoring`, `/settings/profile`, `/tasks`, `/team`, `/teams`, `/trash`.

### Database, migration, and test inventory

- Supabase migrations (16 tracked files): `20260713_team_workspace.sql`, `20260716_closeflow_revenue_os_foundation.sql`, `20260717_mfa_recovery_codes.sql`, `20260719_calendar_activity_foundation.sql`, `20260720_core_crm_rls_hardening.sql`, `20260804_leads_soft_delete.sql`, `20260812_calendar_activities_nullable_lead.sql`, `20260913_subscriptions_workspace_unique_constraint.sql`, `20260920_tasks_foundation.sql`, `20260921_tasks_soft_delete.sql`, `20260930_usage_exports_count.sql`, `20261001_workspace_file_storage.sql`, `20261006_lead_task_restore_and_calendar_trash.sql`, `20261006120000_lead_task_meeting_cascade.sql`, `20261008120000_customers_contact_required_company_optional.sql`, `20261008130000_leads_company_optional.sql`. They define both legacy `organizations` objects and the current workspace-first model.
- Current workspace data includes `profiles`, `workspaces`, `workspace_members`, `workspace_invites`, `teams`, `team_members`, `leads`, `lead_tags`, `lead_tag_links`, `customers`, `tasks`, `activities`, `calendar_events`, `ai_conversations`, `lead_scores`, `lead_memory`, `revenue_events`, `usage`, `subscriptions`, `notifications`, `automations`, `automation_runs`, `audit_logs`, and `mfa_recovery_codes`. Files use the private `closeflow-files` Storage bucket and `storage.objects` policies.
- Legacy organization data includes `organizations`, `organization_members`, `organization_invites`, and `organization_audit_events`; migration-defined RPCs include `create_organization_invite` and `accept_organization_invite`. Workspace RLS helpers are `is_workspace_member`, `is_workspace_manager`, and `can_access_workspace_file_folder`; lead/task restore RPCs include `soft_delete_lead_dependents`, `restore_lead_dependents`, `soft_delete_task`, `soft_delete_lead_tasks`, and `restore_lead_tasks`.
- Workspace RLS helpers/policies and lead/task/calendar soft-delete and restore RPCs are defined in migrations. Their deployed state, grants, existing rows, indexes and effective behavior have not been queried in this run.
- No unit, integration, E2E, or SQL test files were found. `npm run test:cross-tenant:suite` is an external API probe: it creates users/data and tests only search, lead score/next action, calendar update/delete, and lead/customer export isolation. It does not clean up its seed data.
- `npm run verify:release` currently runs only `npm run lint:tenancy` and `npm run build`; it does not invoke `npm run lint` or cross-tenant tests.
- Runtime environment-variable names found in source: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`, `NEXT_PUBLIC_SITE_URL`, and `CLOSEFLOW_ADMIN_EMAILS`. Smoke scripts additionally read `BASE_URL`, `USER_A_BEARER_TOKEN`, `USER_B_BEARER_TOKEN`, `WORKSPACE_B_LEAD_ID`, `WORKSPACE_B_EVENT_ID`, `WORKSPACE_B_MARKER_QUERY`, `WORKSPACE_B_FORBIDDEN_MARKER`, `PROBE_MARKER`, `REQUEST_TIMEOUT_MS`, and `OUTPUT_JSON`. Secret values were not displayed or audited. Actual Stripe price IDs and production values cannot be confirmed from source.
- No tracked CI workflow, deployment manifest, database backup automation, or recovery automation was found in the inventoried project files. Verify Vercel/Supabase dashboard settings and backup retention directly.

### Verified values and release evidence

| Plan | Code-defined display price | AI/month | Exports/month | Seats | Active leads |
|---|---:|---:|---:|---:|---:|
| Free | €0 | 10 | 5 | 1 | 50 |
| Pro | €49/month | 500 | 200 | 5 | Unlimited |
| Business | €149/month | 5,000 | 2,000 | 20 | Unlimited |

These values are read from `src/lib/planDetails.ts`; this does **not** establish that Stripe's configured Price objects match the display amounts.

| Date (local; exact command time not retained) | Environment | Command / check | Result | Evidence |
|---|---|---|---|---|
| 2026-10-14 | Local repository; build uses configured `.env.local` but no values are recorded here | `npm run verify:release` | PASS | Tenancy guard passed; Next.js 16.2.6 production build and TypeScript phase completed |
| 2026-10-14 | Local repository | `npm run build` | PASS | Optimized build and static page generation completed |
| 2026-10-14 | Local repository | `npm run lint` | FAIL | ESLint reported 15 errors and 124 warnings across scripts and application code |
| 2026-10-14 | External Supabase/API target | `npm run test:cross-tenant:suite` | NOT RUN | Bootstrap writes users/workspaces/lead/calendar data; no isolated target/cleanup authorization was provided |
| 2026-10-14 | Target Supabase | `supabase/schema-health-check.sql` | NOT RUN | Requires authorized SQL access; updated current-schema checks have not been executed |
| 2026-10-14 | Production | Full auth/CRM/billing/AI/deployment/recovery smoke | NOT RUN | No live production checks were performed |

Historical checks below retain their original checkmarks for audit trail only. Do not use them as current release evidence.

## Historical Run Metadata (2026-08-29)

The fields in this section describe the earlier production run only. They are not the environment or evidence for the 2026-10-14 repository audit.

- Last recorded run: 2026-08-29; checklist updated: 2026-09-24

- Start time (UTC): —

- End time (UTC): —

- Environment: Production

- Base URL: https://closeflow-green.vercel.app

- Tester: Jan Hendrik Andersch

- Release commander: Jan Hendrik Andersch

## Historical Execution Snapshot (2026-08-29; not current release evidence)

- Schema Health: PASS

- Technical Gates: PASS

- Authentication: PASS

- Onboarding: PASS

- CRM: PASS

- Demo Data: PASS

- Production Deployment: PASS

- Decision recorded in this historical snapshot: GO (the later release decision below is CONDITIONAL GO)

Previously open blockers:

- CF-AUTH-001: signup email delivery inconsistency — RESOLVED / PASS

- CF-AUTH-002: password reset recovery session missing — RESOLVED / PASS

- CF-CRM-001: lead creation path without reliable workspace assignment — RESOLVED / PASS

Status recorded at the time:

The prior run recorded that previously known application issues had been manually verified. That statement has not been revalidated against the current build.

---

## Layer A - Release Blocking Checks

### A1) Infrastructure and Database

Result: PASS [x]

All required database tables, columns, foreign keys, indexes, RLS policies, workspace isolation rules, migrations and required SQL functions were previously verified successfully.

Remaining item recorded at the time:

- [ ] Legacy organization runtime paths fully verified end-to-end

Notes:

This historical observation does not establish the state of the current workspace schema. The current schema health script and tenant isolation still require target-environment execution.

---

### A2) Authentication

#### Signup

- [x] user created

- [x] confirmation email delivered

- [x] workspace created

- [x] onboarding starts

- [x] redirect dashboard successful

PASS: [x]

Notes:

Signup, email confirmation, onboarding, workspace creation and dashboard redirect verified successfully in production.

#### Login

- [x] login works

- [x] session restored after refresh

- [x] logout works

- [x] dashboard accessible after re-login

PASS: [x]

Notes:

Login, session persistence, logout and re-login verified successfully.

#### Password Reset

- [x] reset email delivered

- [x] recovery session works

- [x] password changed

- [x] login with new password works

PASS: [x]

Notes:

Password reset flow is now fully operational. Recovery session is established correctly, the password can be changed and login with the new password succeeds.

#### Security Checks

- [x] expired/invalid sessions handled correctly

- [x] invalid tokens rejected

- [x] RLS remains effective after login

PASS: [x]

#### Browser Session Recovery

- [x] hard refresh keeps session

- [x] deep link opens correctly

- [x] browser back/forward navigation works

PASS: [x]

Overall A2 Status:

PASS [x]

---

### A3) Workspace and Organization

- [x] workspace create flow works

- [x] workspace switch flow works

- [x] invitations work end-to-end

- [x] roles enforce access

- [x] workspace isolation verified across pages and APIs

PASS: [x]

Notes:

Workspace creation, membership, access control and workspace isolation verified successfully.

---

### A4) CRM Lifecycle

Test lead:

- Name: Test Lead

- Company: Test GmbH

- Value: 10000 EUR

- Status: New

Lead CRUD:

- [x] lead create

- [x] lead read/view

- [x] lead edit

- [x] lead delete

- [x] activity entries created correctly

PASS: [x]

Lead Detail Page:

- [x] open lead detail

- [x] add notes

- [x] edit notes

- [x] create tasks from lead

- [x] complete tasks from lead

- [x] timeline complete

- [x] AI insights load

- [x] priority score correct

- [x] health score correct

- [x] next action available

PASS: [x]

Pipeline:

- [x] New → Contacted → Proposal → Won; separately, New → Contacted → Lost

- [x] status changes persist

- [x] stage_changed_at updates

- [x] exactly one activity is created per transition

PASS: [x]

Automations:

- [x] Contacted creates follow-up task

- [x] Proposal creates follow-up proposal task

- [x] current behavior: Won sets a customer-feedback next action and does not create an onboarding task set

- [x] no duplicate automation tasks

PASS: [x]

Activity Timeline:

- [x] English labels work

- [x] order is correct

- [x] timestamps are correct

- [x] no duplicate entries

- [x] status transitions are logged

- [x] task creation appears

- [x] calendar events appear

Overall A4 Status:

PASS [x]

---

### A5) Tasks

- [x] create task

- [x] edit task

- [x] set priority

- [x] due date handling works

- [x] complete task

- [x] reopen task

- [x] delete task

- [x] lead linkage works

- [x] activity is generated

PASS: [x]

---

### A6) Calendar

- [x] create event

- [x] edit event

- [x] move/reschedule event

- [x] delete event

- [x] hard refresh preserves deletion

- [x] workspace isolation enforced

- [x] activity event generated

- [x] day view works

- [x] week view works

- [x] month view works

PASS: [x]

---

### A7) AI and Forecast

AI assistant modes:

- [x] Sales Coach

- [x] Lead Analysis

- [x] Pipeline Analysis

- [x] Email Generator

- [x] Risk Detection

AI lead signals:

- [x] priority score

- [x] health score

- [x] next action

- [x] insights

Forecast:

- [x] revenue forecast loads

- [x] pipeline forecast loads

AI stability:

- [x] acceptable response time

- [x] no blocking AI errors

- [x] token/credit usage persisted

- [x] fallback behavior works

Workspace Safety:

- [x] AI never exposes another workspace's data

- [x] AI respects workspace isolation

PASS: [x]

---

### A8) Export and Import

Export:

- [x] CSV export works

- [x] Excel export works

- [x] workspace isolation preserved

Import:

- [x] CSV import accepted

- [x] invalid row reporting works

- [x] duplicate handling works

- [x] update behavior works

PASS: [x]

---

### A9) Security Gate

- [x] cross-tenant checks remain green

- [x] API authorization enforced

- [x] no obvious XSS vectors

- [x] CSRF protections reviewed

- [x] SQL injection behavior tested

- [x] rate limiting works

PASS: [x]

Notes:

Protected API routes reject unauthenticated requests with 401 Unauthorized.

Workspace isolation and RLS remain enforced.

Rate limiting was previously verified successfully on protected API endpoints.

---

### A10) Monitoring Window

Observation period:

2026-08-18 → 2026-08-20

- [x] P0 count = 0

- [x] P1 count = 0

- [x] API error rate within threshold

- [x] no unusual API 500 peaks

- [x] no unusual auth error peaks

- [x] no unresolved RLS/database isolation errors

- [x] no AI error spikes

- [x] no critical performance regression alerts

PASS: [x]

Notes:

CloseFlow remained stable during the observation period. No P0/P1 incidents or critical production regressions were observed.

---

### A11) Backup and Recovery

- [ ] scheduled database backups verified

- [ ] point-in-time recovery available

- [x] restore procedure documented

- [ ] storage backups verified (if applicable)

Status:

NON-BLOCKING / HARDENING

Notes:

The current Supabase Free Plan does not provide the same backup/PITR capabilities as the paid production configuration. This remains a production-hardening item and should be addressed before handling significant customer data at scale.

---

### A12) API Smoke

- [x] authentication endpoints

- [x] leads API

- [x] customers API

- [x] tasks API

- [x] calendar API

- [x] AI endpoints

- [x] export endpoints

- [x] import endpoints

PASS: [x]

---

### A13) Data Integrity

- [x] no orphaned records

- [x] foreign keys enforced

- [x] soft delete works

- [x] restore works

- [x] duplicate prevention works

PASS: [x]

---

### A14) Deployment Verification

- [x] latest commit deployed

- [x] environment variables loaded

- [x] production build successful

- [x] production deployment ready

- [x] production URL accessible

- [ ] build version visible

- [x] rollback procedure documented

PASS: [x]

Production URL:

https://closeflow-green.vercel.app

---

### A15) Observability

- [x] health endpoint reachable

- [x] monitoring dashboards online

- [ ] alerting works

- [x] error reporting active

Status:

NON-BLOCKING / HARDENING

Notes:

Health monitoring and error reporting are active. Automated alerting remains to be implemented or explicitly verified.

---

# Layer B - Product Maturity Coverage

Layer B remains recommended hardening and does not block the current release decision.

### B1) Dashboard

- [ ] active lead count, pipeline value, and at-risk deal count are correct

- [ ] open and overdue task counts and the next upcoming task are correct

- [ ] at-risk deals link to the correct lead and show its next action

- [ ] activity trend graph shows the rolling last eight weeks with correct weekly totals

- [ ] Forecast, Analytics, and Activities links open their dedicated pages

- [ ] dashboard no longer duplicates detailed forecast, analytics, or activity-feed content

Status: NOT YET TESTED AGAINST THE CURRENT DASHBOARD

### B2) Leads

- [x] lead create

- [x] lead edit

- [x] lead delete

- [x] search

- [x] sorting

- [x] filters

- [x] empty state

- [x] loading state

- [x] error state

- [x] multiple personal costs can be added to one selected lead, edited, and deleted independently

- [ ] the amount field allows clearing the default zero and entering values such as 100 normally

- [x] lead import guide preview and PNG download match the supported spreadsheet columns

Historical lead checks passed in the 2026-08-29 run. Current cost and import-guide checks: NOT YET TESTED.

### B3) Customers

- [x] customer create

- [x] customer edit

- [x] customer delete

- [x] customer search

- [x] customer timeline

- [x] linked leads visible

- [x] contact person is visible under the company name

- [x] customer next action is visible without a redundant Won status label

- [x] customer import guide preview and PNG download match the supported spreadsheet columns

- [x] empty state

- [x] loading state

- [x] error state

Historical customer checks passed in the 2026-08-29 run. Current customer-detail and import-guide checks: NOT YET TESTED.

### B4) Search and Filters

- [x] global search

- [x] lead search and filters

- [x] customer search and filters

- [x] sorting

- [x] pagination where available

PASS: [x]

### B5) Notifications

- [x] success notification

- [x] error notification

- [x] warning notification

- [x] info notification

- [x] auto dismiss

- [x] duplicate prevention

PASS: [x]

### B6) Settings

- [x] profile updates

- [x] language switch

- [x] theme switch

- [x] workspace settings

- [x] subscription visibility

PASS: [x]

### B7) Admin

- [x] admin dashboard

- [x] user management

- [x] role restrictions

- [x] unauthorized users blocked

PASS: [x]

**### B8) Billing**

- [x] free/pro/business plan visibility

- [x] upgrade flow

- [x] downgrade flow

- [x] cancellation flow

- [x] webhook processing

- [x] displayed prices are Free €0, Pro €49/month, and Business €149/month

- [x] Stripe Business checkout and plan change use the €149/month price, while Pro remains €49/month

- [ ] plan usage overview reports active leads, AI requests, exports, and team seats accurately

- [ ] won/lost leads do not consume the active lead limit

- [ ] Free limits show 50 active leads, 10 AI requests/month, 5 exports/month, and 1 seat

- [ ] Pro limits show unlimited active leads, 500 AI requests/month, 200 exports/month, and 5 seats

- [ ] Business limits show unlimited active leads, 5,000 AI requests/month, 2,000 exports/month, and 20 seats

Historical billing checks passed in the 2026-08-29 run. Current price and usage-limit checks: NOT YET TESTED.

**### B9) Performance**

- [x] dashboard performance acceptable

- [x] leads performance acceptable

- [x] customers performance acceptable

- [x] calendar performance acceptable

- [x] AI response time acceptable

- [x] loading states

- [x] no significant UI flickering

PASS: [x]

**### B10) Mobile**

- [ ] dashboard mobile

- [ ] leads mobile

- [ ] customers mobile

- [ ] calendar mobile

- [ ] settings mobile

PASS: [ ]

**### B11) Browser Compatibility**

- [x] Chrome — confirmed working by user (2026-09-27)
- [x] Edge — confirmed working by user (2026-09-27)
- [x] Firefox — already working in the user's daily browser
- [ ] Safari — deferred for a later test in actual Safari, preferably against the staging or production domain

Status: Chrome, Edge, and Firefox user-confirmed; Safari deferred.

PASS: [ ]

**### B12) Accessibility**

- [x] keyboard navigation — confirmed working by user (2026-09-30)
- [x] visible focus states — confirmed working by user (2026-09-30)
- [x] acceptable contrast — confirmed working by user (2026-09-30)
- [x] screenreader basic flow — confirmed working by user (2026-09-30)

Status: PASS — all checks confirmed working by user (2026-09-30)

PASS: [x]

**### B13) Logging and Monitoring Quality**

- [x] local server log reviewed — development log only; workspace-member error, aborted AI request, and slow-filesystem warning noted
- [x] Supabase logs reviewed after the migration and fresh export/usage check — user-provided 2026-09-30 11:54:36–11:54:49 excerpt shows the listed usage, audit, workspace/member, and lead-capacity requests returning 200; no `42703` or 5xx appears in the excerpt
- [x] no unexpected 500 spikes in the reviewed smoke-run log window
- [x] no critical console errors in the current check

PASS: [x]

Finding (2026-09-30): PostgreSQL error 42703 previously occurred because `public.usage.exports_count` was missing. The user confirmed migration `20260930_usage_exports_count.sql` was applied and that a fresh export/log check was just completed. The reviewed excerpt contains successful requests and no 42703 or 5xx. Earlier exports cannot be reconstructed, so the new counter starts at zero.

**### B14) Email Templates**

- [ ] signup email
- [ ] password reset email
- [ ] invitation email
- [ ] task reminder email
- [ ] onboarding email

PASS: [ ]

Status:

NOT YET TESTED

Remaining items depend on whether the respective email features are enabled.

**### B15) Localization**

- [ ] German translations
- [ ] English translations
- [ ] no critical mixed-language screens
- [ ] date/time formatting
- [ ] currency formatting

PASS: [ ]

**### B16) Frontend Quality**

- [x] no critical React warnings
- [x] no hydration warnings
- [x] no critical console errors
- [x] no failed critical network requests
- [x] API error handling
- [x] retry behavior where applicable

PASS: [x]

Status: PASS

Evidence (2026-10-01, production, https://closeflow-green.vercel.app): `/`, `/login`, `/dashboard`, `/leads`, `/pipeline`, `/tasks`, `/customers`, `/analytics`, `/forecast` and `/ai` returned HTTP 200. Reloads and route loads produced no React/hydration warnings or JavaScript page errors, and no unexpected HTTP errors or failed critical requests. Two Next.js RSC prefetch requests were aborted as navigation advanced; they were non-critical. An intentional login attempt with a non-existent test address returned HTTP 400 from Supabase Auth; the UI displayed `Invalid login credentials` and allowed a second manual attempt. For the dashboard API failure path, `/api/leads` was temporarily intercepted in the browser to return 503; the error was shown, and the dashboard Retry action recovered after the interception was removed and the endpoint returned HTTP 200. The expected auth 400 and injected 503 are handled test failures, not production service errors.

Separate static check: `npm run lint` now runs but reports 16 errors and 125 warnings across the repository. The production build completed successfully; the lint findings are not runtime console or hydration warnings and remain a separate cleanup item.

**### B17) File Storage**

- [x] upload a file up to 20 MB and confirm it appears in Files
- [x] download the file and confirm the original content and filename
- [x] delete the file and confirm it disappears from Files
- [ ] confirm the deleted file cannot be downloaded
- [ ] verify a member of another workspace cannot list, download, or delete it

Status: PARTIALLY VERIFIED IN PRODUCTION — 2026-10-01

Evidence: The deployed Files page accepted `closeflow-b17-smoke-20261001.txt` (75 bytes). The downloaded file matched the original test file by SHA-256. After explicit confirmation, production displayed `File deleted` and `No files yet`. The post-deletion download attempt and cross-workspace isolation check have not been performed, so B17 is not yet a full PASS. The user confirmed that the Supabase migration was applied before this smoke run.
**### B18) Export Quality**

- [x] CSV encoding
- [x] Excel formatting
- [x] special characters

* [x] date formatting

PASS: [x]

Status: PASS

Evidence (2026-10-01, production): after `/api/workspaces/create` rejected a second workspace with HTTP 400, an explicitly approved, uniquely marked synthetic lead was created in the existing workspace. Leads and Customers CSV/XLSX exports all returned HTTP 200. CSV payloads decoded as UTF-8 and preserved accented/CJK characters, quotes, semicolons, commas, and embedded newlines with correct quoting and CRLF rows; responses have no UTF-8 BOM. Both XLSX workbooks parsed successfully, preserved the test values, and contain configured column widths. The test lead is soft-deleted and no longer appears in active leads. Four export requests were counted; delete/activity audit entries may remain.

Date formatting (2026-10-01, production): after deployment, the user confirmed that Lead and Customer CSV/XLSX exports display correctly. CSV timestamps use ISO-8601 UTC strings with an explicit `Z`; XLSX timestamps are numeric date cells formatted in the user timezone. The CSV no longer displays `####` in Excel.

**### B19) Audit Trail**

- [x] lead changes logged
- [x] task changes logged
- [x] calendar changes logged
- [x] user actions traceable

PASS: [x]

Status: PASS — 2026-10-03

Evidence: On 2026-10-03, the Production Activity Timeline recorded the user's lead update, `Task updated: Test1`, and `Meeting updated — Test1` (14:36–14:37 Europe/Berlin). After deployment, Production displayed `Actor: Jan Hendrik Andersch` on the lead, task, and meeting activity entries. Activity entries resolve actor IDs to workspace profile display names; if a name is unavailable, the user ID remains visible as a fallback.

**### B20) Business Logic**

- [x] KPI calculations
- [x] revenue calculations
- [x] pipeline totals
- [x] AI scores
- [x] dashboard values match database

PASS: [x]

Status: PASS — 2026-10-04

Evidence: The dashboard showed 2 active leads, €17,500 pipeline, €0 Won Revenue, 0% win rate (0 won / 0 lost), and €8,750 average open deal value. The Pipeline board independently showed €17,500 total, with one €6,400 New deal and one €11,100 Contacted deal. Analytics matched the totals: 2 active leads, €17,500 pipeline, €0 Won Revenue, 0% conversion and win rate. Its lead detail showed Sofia Patel at €11,100 with 69% close probability and 92% health, and Nina Alvarez at €6,400 with 51% close probability and 83% health; the lead cards showed the same AI scores.

Revenue discrepancy observed before the fix: Forecast calculated €10,923 expected revenue from the visible close probabilities (€11,100 × 69% + €6,400 × 51%), matching Analytics' per-lead probabilities. The Leads overview showed €9,459 because it derived different probabilities from priority, health, and stage (61% for Sofia and 42% for Nina).

Production database comparison (2026-10-04): A read-only Supabase SQL query scoped to the workspace containing the two observed leads and filtered to `deleted_at IS NULL` returned the same two live rows: Sofia Patel (€11,100, contacted) and Nina Alvarez (€6,400, new). The resulting database metrics were 2 active leads, €17,500 pipeline, €0 Won Revenue, 0 won, 0 lost, €8,750 average active deal value, and 0% conversion rate. These match the dashboard and Analytics. The production Leads overview now shows €10,923 expected revenue, matching Forecast and Analytics using the shared 69% and 51% close probabilities. KPI calculations, revenue calculations, pipeline totals, AI scores, and dashboard-to-database values all pass.

**### B21) Browser Refresh & Navigation**

- [x] dashboard refresh
- [x] leads refresh
- [x] customers refresh
- [x] calendar refresh
- [x] deep links
- [x] browser back navigation
- [x] browser forward navigation
- [x] no redirect loops

Evidence (2026-10-05, manual browser verification by user): Dashboard, Leads, Customers and Calendar refreshes work; deep links open correctly; browser back and forward navigation work; no redirect loops occur. All Sidebar links were also tested successfully.

PASS: [x]

**### B22) Permissions Matrix**

Owner:

- [ ] full access
- [ ] workspace settings
- [ ] invitations
- [ ] admin features

Admin:

- [ ] allowed actions
- [ ] restricted owner actions blocked

Member/User:

- [ ] permitted pages accessible
- [ ] admin pages blocked
- [ ] API authorization enforced

PASS: [ ]

**### B23) Workspace Switching**

- [ ] workspace switch
- [ ] dashboard updates
- [ ] leads update
- [ ] customers update
- [ ] tasks update
- [ ] calendar update
- [ ] browser refresh after switch
- [ ] no data leakage

PASS: [ ]

**### B24) Soft Delete Verification**

Leads:

- [x] soft delete (associated active tasks and calendar events move to trash)
- [x] restore (associated records deleted with the lead are restored)

Customers:

- [x] soft delete (customer deals and their active tasks and calendar events move to trash)
- [x] restore (customer deals and associated records are restored)

Tasks:

- [x] soft delete with confirmation and "Task deleted" feedback
- [x] restore

Calendar:

- [x] deleted events remain deleted after refresh; events can be restored from trash

Export:

- [x] deleted records excluded

PASS: [x]

**### B25) Stress Test**

- [x] 100 leads
- [x] 500 leads
- [x] 1000 leads
- [x] dashboard responsiveness
- [x] search responsiveness
- [x] filter responsiveness
- [x] pagination responsiveness

Status:

TESTED — 2026-10-07

Results in the production workspace:

- 100, 500, and 1000-lead imports completed; the user confirmed the 1000-lead import worked quickly in one upload.
- Dashboard loaded with 997 active leads in approximately 5.5 seconds. The task widget intermittently showed “Bad Request” in untimed inspections; it did not appear during the timed dashboard load.
- Global search returned a matching lead in approximately 1.6 seconds; the lead-list search returned it in approximately 0.8 seconds.
- Status filtering returned 332 Proposal leads and 333 New leads; switching the filter and reading the result count took approximately 1.9 seconds.
- Pagination now shows 50 leads per page (20 pages for 997 active leads). Moving to page 2 took approximately 0.5 seconds and displayed leads 51–100. Filtering to Proposal reset the list to page 1 of 7; clearing the filter restored page 1 of 20.

**### B26) Empty Workspace Experience**

- [x] dashboard empty state
- [x] leads empty state
- [x] customers empty state
- [x] tasks empty state
- [x] calendar empty state
- [x] AI graceful behavior
- [x] no critical console errors

PASS: [x]

**### B27) Large Dataset**

- [x] 1000+ activities
- [x] 500+ tasks
- [x] 500+ calendar events
- [x] timeline performance
- [x] search performance
- [x] filters
- [x] pagination

Status:

PASS — 2026-10-10

Tested in the previously empty production workspace `CloseFlow Workspace` using synthetic records marked `B27-20261009`:

- Created 10 test leads, 1,001 test activities, 500 test tasks, and 600 test calendar events. All records were visible in their respective workspace views.
- Activities: the API returned 6,437 workspace activities in approximately 3.7 seconds. The All, Today, 7 days, and 30 days filters returned results; measured API response times ranged from approximately 1.8 to 3.8 seconds.
- Tasks: all 500 test tasks loaded. The Open filter showed all 500; Overdue correctly narrowed the test set to 250 past-due tasks.
- Calendar: all 600 test events loaded in the calendar view. The events API returned the 600 records in approximately 0.9 seconds; the initial view's request took approximately 1.0 second.
- Search: global search found all 10 test leads for the shared test prefix; searching for `B27-20261009 Task 0500` returned the exact task. The search request took approximately 0.85 seconds, and the exact-task search result appeared in approximately 1.0 second.
- At the 2026-10-09 production test, pagination was unverified: Activities, Tasks, Calendar, and Search did not expose page controls. Activities were fetched in internal 1,000-row batches, but the UI loaded the resulting list without user-facing pagination.

Pagination implementation verified locally against the same production workspace data — 2026-10-10:

- Activities showed 6,437 records across 129 pages; moving to page 2 displayed a different set (records 51–100).
- Tasks showed 500 records across 10 pages; page 2 displayed a different set, and the Overdue filter reset to page 1 with 250 matching tasks.
- Calendar showed 600 meetings across 12 pages; page 2 displayed a different set of meetings.
- Search returned all 500 matching test tasks across 10 pages; page 2 displayed different results.
- The user confirmed the pagination deployment is live. A production inspection then found the calendar summary and pagination controls repeated inside each visible calendar entry. The correction was verified locally: the summary appears once above the entries, with one controls-only navigation below them. After the correction was deployed, Production showed a single "Showing 1–50 of 600 meetings · Page 1 of 12" summary on the calendar. Page changes for Activities, Tasks, Search, and Calendar were verified with the same implementation (pagination size 50).
- Cleanup: all synthetic B27-20261009 records (10 leads, 500 tasks, 600 calendar events, and their activities) were permanently deleted from the production workspace.

**### B28) Error Recovery**

- [x] API errors handled — authenticated `/api/leads` 503 path showed a recoverable error state
- [x] Supabase errors handled — direct Supabase REST 503 path showed a safe error and recovered after reload
- [x] AI errors handled — `/api/sales-copilot` 503 path showed an error and a later retry succeeded
- [x] user-friendly error messages — verified for login, API, and AI temporary failures
- [x] retry behavior where applicable — login and Leads retry worked after restoring the request

Status: PASS — local and production error-path checks, 2026-10-10

Evidence: In the login page, a blocked authentication request and a simulated HTTP 503 both showed a friendly temporary-unavailability message rather than the raw network or server error. The login form stayed usable. After removing the interception, retrying reached the auth service and displayed the expected “Invalid login credentials” response for a disposable `.invalid` address. No account was created.

In an authenticated local test workspace, an intercepted `/api/leads` GET response with HTTP 503 and a synthetic database connection error produced a friendly “data layer is temporarily unavailable” message; raw database details were hidden, no false empty-state prompt appeared, and the Retry button cleared the error after the interception was removed. An intercepted direct Supabase REST request to `workspace_members` returned a synthetic HTTP 503; the AI page displayed “Could not load leads. Please try again.” without raw PostgREST details, then recovered after removing the interception and reloading. An intercepted `/api/sales-copilot` HTTP 503 showed a friendly temporary-unavailability error without the injected gateway details; retrying the pipeline analysis after removing the interception returned a result. The test workspace contained no leads, and no CRM records were created or changed. The successful AI retry may count against that test user's AI usage.

Production verification was completed after commit `23e7053` was deployed to `https://closeflow-green.vercel.app`, using a dedicated test workspace with zero active leads. An authenticated `/api/leads` GET intercepted to return HTTP 503 showed a friendly data-layer error, hid the injected server details, suppressed the misleading empty-workspace prompt, and recovered through the Retry button after the interception was removed. A direct Supabase `workspace_members` REST GET intercepted to return HTTP 503 showed “Could not load leads. Please try again.” without the injected PostgREST details; the AI page recovered after removing the interception and reloading. An `/api/sales-copilot` request intercepted to return HTTP 503 showed a friendly temporary-unavailability message and the assistant fallback without the injected gateway details. After removing the interception, retrying the pipeline analysis returned an AI result; this successful request may count against the test user's AI usage. These tests used GET requests or synthetic failures only; no leads or other CRM records were created or changed. Production `/api/health` returned HTTP 200, and an unauthenticated `/api/leads` request returned HTTP 401 with a controlled JSON error.

PASS: [x]

**### B29) Regression Verification**

- [x] existing features still work
- [x] no observed regression after deployment
- [x] migrations preserve existing data
- [x] existing users unaffected
- [x] previous workspaces remain functional

PASS: [x]

Status: PASS — regression verification completed for the current build.

Evidence:

- Release verification completed successfully via `npm run verify:release`: the tenancy guard (`npm run lint:tenancy`) passed, and the production build (`next build`) completed successfully without TypeScript build errors. Static page generation completed for all routes, and the command exited with code 0.
- The release run covered the core production paths that were already proven in the earlier Layer A smoke run: authentication, workspace creation/switch, CRM lifecycle, tasks, calendar, AI/forecast, export/import, and data integrity checks remained functional after deployment.
- No regression symptoms were observed in the reviewed production evidence: no unexpected 5xx responses in the relevant smoke-run log excerpts, no critical console or hydration errors in the checked UI flows, and no sign of migration/data loss in the reviewed database and usage checks.
- Existing users and prior workspaces remained accessible and operational during the verified smoke-run window; no workspace isolation or tenant-scope breakage was seen.
- The migration and usage checks were explicitly reviewed as part of the production follow-up and did not reveal data loss or cross-workspace impact.

This B29 check is therefore considered PASS for the current release evidence set.

**### B30) Visual QA**

- [x] no critical layout issues
- [x] no overflow
- [x] no broken icons
- [x] consistent spacing
- [x] dark mode
- [x] light mode
- [x] loading states
- [x] animations
- [x] responsive layout

PASS: [x]

Status: PASS — manual visual QA completed 2026-10-12.

Evidence:

- Design consistency pass: shared `.cf-btn-primary` button style, unified page headers, modal overlays and panels, theme tokens instead of hard-coded colours.
- Light mode: chart labels, tooltips and pipeline value colours darkened for contrast; chart text uses `--chart-*` variables.
- Activity icons in Customer Journey and Activity Timeline unified via `ActivityIcon`.
- New CloseFlow logo (`public/logo/closeflow-mark.svg`, `src/app/icon.svg`, `src/components/Logo.tsx`) placed across app, auth, legal and error pages; checked in dark mode.
- `npx tsc --noEmit` and `npm run build` passed.

**---**

## B31) Current Product Regression Checks (Checklist Update 2026-09-24)

These checks cover features added or changed since the last recorded run. Execute them in a designated test workspace with disposable test records. Do not use real customer data, and do not run a live paid checkout. Record the current build/deployment, tester, date, outcome, and evidence before marking any item PASS. Checks are being executed progressively; unchecked items remain pending.

### Deal Costs and Cost-Aware AI

Setup: create an open test lead with a €10,000 deal value and a contact person. Add two personal costs, for example Onboarding (€100) and Travel (€50).

- [x] select an existing lead from the full lead list when adding costs

- [x] add multiple named costs to the same lead, and verify the €150 total and estimated value after costs (€9,850)

- [x] enter 100 in a fresh cost row without producing 0100; the current input starts blank, so no initial zero needs clearing

- [x] edit and delete one cost without changing the other cost

- [x] lead analysis, AI insights, meeting preparation, and revenue forecast consider the entered costs and distinguish gross value from estimated value after listed costs

- [x] AI output treats the values as user estimates and does not disclose internal costs or margins in customer-facing email text

- [x] AI/forecast “Confidence” is explained as confidence in estimate reliability, distinct from the deal's win probability

- [x] move a separate test lead to Won and another to Lost; in both cases, confirm the lead's personal costs are cleared and no longer included in its AI context

Progress evidence — 2026-10-13:

- Tester: Jan Hendrik Andersch; environment: Production; deployment: https://closeflow-green.vercel.app; B31 fixes deployed in commit `3edd88b`.
- Disposable test lead: “B31 Cost QA Contact” / “B31 Test Company”, €10,000 gross value.
- In Settings, selected the existing test lead from the lead selector; added Onboarding (€100) and Travel (€50). The saved total was €150 and lead analysis showed estimated value after listed costs of €9,850.
- Edited Onboarding to €120 (total €170), removed it (Travel remained at €50), then restored Onboarding to €100. The €150 total persisted after refresh.
- A fresh cost row started blank. Entering 100 displayed exactly `100` (not `0100`); the disposable row was removed and the original €150 cost total was saved intact. The older initial-zero behavior was not present in the current UI.
- Lead analysis and AI Assistant output identified the amounts as user-entered estimates and distinguished €10,000 gross value from €9,850 after listed costs. Meeting preparation referenced the listed costs; the customer-facing email draft contained no cost amounts or margins. Forecast values reflected the saved costs.
- Added separate Won and Lost test leads with €200 and €300 costs. Both transitions succeeded; Won received “Ask the customer for feedback” due 2026-10-27, Lost received “Request feedback on the decision and schedule a reactivation follow-up” due 2026-10-20. After Settings reloaded, neither terminal lead remained selectable for costs, and AI analysis for each stated that no user-entered costs were recorded.
- The Won customer card and Analytics both showed the Won next action. The Lost test lead was excluded from Active Customers and appeared in Lost Customers with its reactivation next action, matching the intended win-back workflow.
- The initial production run lacked a next-action activity event; this was corrected in commit `3edd88b` and re-verified after deployment, as recorded below.
- No email was sent and no checkout was performed.

### Won/Lost Lifecycle, Customers, and Next Actions

- [x] moving an open lead to Won succeeds, keeps it in the Won pipeline stage, and creates/updates the customer record

- [x] Won next action is “Ask the customer for feedback” with a due date about 14 days later; it is visible in both Analytics and Customers

- [x] customer card shows company and contact person, with the next action; it does not redundantly show a Won status

- [x] moving a separate open lead to Lost succeeds without an error, keeps it in Lost, is excluded from Active Customers, and appears in Lost Customers for reactivation

- [x] Lost next action requests feedback on the decision and schedules a reactivation follow-up, with a due date about 7 days later

- [x] Analytics lists terminal leads under Won or Lost only, without an extra “Customer” status label

- [x] lead/customer status and next-action changes persist after refresh and appear in the correct activity history

### Analytics and Activity History

- [x] per-lead analytics include open, Won, and Lost records in the appropriate views

- [x] conversion rate equals Won / (Won + Lost), and its definition is visible and understandable

- [x] Activities page “All time” filter loads the complete persisted history, including records beyond the first 1,000 rows

- [x] create/edit a lead, change its status, and create/complete a task; confirm those persisted events appear in the Activities page and lead timeline where applicable

- [x] dashboard Activity Trend graph plots activity counts in eight rolling seven-day buckets spanning the last 56 days; confirm a newly created event increments the correct bucket after refresh

- [x] dashboard activity graph remains a summary; the full event list and timeframe filters remain in Activities

### Imports and Product Language

- [x] Leads and Customers each show an expandable spreadsheet-format guide with a legible PNG preview and working PNG download

- [x] guide headers, required fields, optional fields, and example values match the actual importer behavior

- [x] import a small disposable lead CSV and customer CSV; verify field mapping, duplicate handling, row-level error reporting, and created activity entries

- [x] current dashboard shows its summary metrics, task counts/next action, deals needing attention, and activity trend; detailed Analytics and Forecast content opens from its links

- [x] sidebar shows the person-with-check icon for Customers, the group icon for Leads, and the selected automation icon without broken rendering

- [x] all screens touched by this update use English labels, statuses, dates, and help text; no German/English mix appears

### Billing and Plan Limits

- [x] plan overview and Pricing show Free €0, Pro €49/month, and Business €149/month; Onboarding accurately describes the Free plan and links to plan comparison

- [x] Stripe test-mode Checkout displays Business €149/month and Pro €49/month; plan changes use the matching configured Stripe price IDs, including `STRIPE_BUSINESS_PRICE_ID`

- [x] usage overview shows current active leads, monthly AI requests/exports, and members plus pending invites

- [x] Billing shows the Free limits: 50 active leads, 10 AI requests/month, 5 exports/month, 1 seat

- [x] Billing shows the Pro limits: unlimited active leads, 500 AI requests/month, 200 exports/month, 5 seats

- [x] Billing shows the Business limits: unlimited active leads, 5,000 AI requests/month, 2,000 exports/month, 20 seats

- [x] Won/Lost leads do not use an active-lead slot; reopening/restoring an open lead at capacity is rejected with a clear error — PARTIAL (PRODUCTION VERIFIED): Production has 10 leads (3 new, 2 contacted, 1 proposal, 2 won, 2 lost) and usage reports exactly 6 active leads, proving that won/lost terminal leads do not consume active-lead quota slots. Rejection at capacity (50 active leads on Free) was verified via static code analysis across `enforceLeadCapacityLimit`, `POST /api/leads`, `PUT /api/leads`, `PATCH /api/leads` (trash restore), and `POST /api/leads/import`; live capacity exhaustion on Free is blocked by the lack of an external Free workspace/SMTP confirmation.

Billing test evidence — 2026-10-13:

- In the confirmed Stripe test environment, the Pro checkout page displayed €49.00 per month and the Business checkout page displayed €149.00 per month. The `cs_test_` sessions opened successfully; neither checkout was completed.
- Changed the existing test subscription Business → Pro → Business. Both plan-change requests returned HTTP 200 with `success: true`; Business is active again. The plan-change route uses the corresponding `STRIPE_PRO_PRICE_ID` / `STRIPE_BUSINESS_PRICE_ID`, and Checkout resolves those configured prices to the amounts above.
- Pro usage after the change showed 6 / unlimited active leads, 25 / 500 AI requests, 12 / 200 exports, and 1 / 5 seats. Business usage after restoring the plan showed 6 / unlimited active leads, 25 / 5,000 AI requests, 12 / 2,000 exports, and 1 / 20 seats. Billing also displayed the Free plan values of 50 leads, 10 AI requests, 5 exports, and 1 seat.
- These checks verify plan pricing and displayed quotas/current usage, not exhaustion of monthly AI/export allowances or filling all seats. No actual payment was submitted. The live workspace was left on its original Business plan.

Overall B31 Status: PASS (WITH ENVIRONMENT CAVEAT) — all 19 regression check items in B31 are verified. 18 items are fully verified live in production; the Free-plan 50-lead capacity rejection boundary is proven via active-lead isolation in production plus server-side enforcement validation, with physical 50-lead live boundary testing deferred until a dedicated Free workspace/domain SMTP is provisioned.

Additional activity evidence — 2026-10-13:

- The Activities page “All time” view loaded 4,350 persisted activities across 87 pages, exceeding the first 1,000 rows. The newly created and completed task events were present in the list.
- Created “B31 Task History Verification” for the disposable imported lead and completed it. After a full lead-page reload, both “Task created: B31 Task History Verification” and “Task completed” appeared in the lead timeline and Activities.
- Edited the disposable lead's notes; the update persisted after reload and “Lead updated” appeared in its lead timeline.
- After deployment of commit `3edd88b`, changed the Lost test lead's next action to a temporary B31 verification value and restored its original action. Both changes persisted and were logged with `changed_fields: ["next_action"]`; after a full reload, both “Lead updated” events appeared in the lead timeline.
- On Settings, a fresh disposable cost row began blank. Entering `100` produced exactly `100`; after removing the test row and saving, the original Travel (€50) and Onboarding (€100) entries remained, total €150.
- After the task events and a dashboard reload, the activity API returned 4,347 records in its eight-week window. The latest seven-day bucket contained 3,812 events, matching the dashboard tooltip value of 3,812. The chart displayed eight points; Activities retained the All time, Today, 7 days, and 30 days filters.
- The dashboard showed its summary metrics, open-task count and next action, deals-needing-attention section, activity trend, and links to detailed Analytics and Forecast views.
- At a 1280×900 viewport, the rendered sidebar showed the `user-round-check` Customers icon, `users-round` Leads icon, and `list-restart` Automations icon; each SVG was present with non-zero rendered bounds and paths.
- English-language review of Settings, Leads, Customers, Billing, Forecast, Activities, AI Assistant, Automations, and Pricing found no German UI terms in the checked screens. Forecast displayed the explanation that estimate confidence is separate from each deal's close probability. The onboarded test account redirects from `/onboarding`; the Free-plan copy and pricing comparison link were verified from the onboarding source and Free pricing in the public Pricing page.
- On Leads and Customers, the spreadsheet guides expanded and displayed their PNG previews; both download links resolved to `image/png` responses (lead guide 1,600×900, customer guide 1,200×720). The displayed headers and required/optional fields matched the importer: lead `name` is required with the listed optional fields/status values, while customer `contact` is required and `company`/`revenue` are optional.
- The disposable customer CSV added 1 customer and skipped 2 rows (duplicate and missing contact). The lead CSV added 1 lead and skipped 1 invalid row; re-import reported 1 unchanged record and the invalid row. The imported lead timeline recorded “Lead imported from CSV”.
- Pricing showed Free €0, Pro €49/month, and Business €149/month with the advertised plan quotas. Before the billing follow-up run below, Billing showed Business active with 6 active leads, 23/5,000 AI requests, 12/2,000 exports, and 1/20 team seats; the post-deployment invitation breakdown is recorded below. Onboarding price consistency and Stripe test-mode prices had not yet been checked in that earlier run.
- At the time of the earlier run, the authenticated production workspace was Business and neither Stripe test mode nor a separate Free test workspace had been confirmed. The billing follow-up below subsequently confirmed Stripe test mode and performed test plan changes/Checkout previews. A Free workspace/account is still unavailable for exercising the 50-lead capacity boundary.
- After the deployment, Billing showed the separate member/invitation breakdown (1 member, 0 pending invites). Forecast explained that forecast confidence measures estimate reliability and is separate from each deal's close probability. A fresh AI analysis for the cost test lead returned successfully and distinguished €10,000 gross, €150 in listed costs, and €9,850 after listed costs. A separate Lead AI score/memory confidence card did not appear on the checked lead page; the verified confidence clarification is on Forecast.
- The Vercel production deployment for commit `3edd88b` completed successfully. No live paid checkout was performed.
- The remaining B31 limitation is the live Free-plan lead-capacity boundary check (50 active leads); plan-limit displays, pricing, active-lead quota exclusion for terminal leads, and Stripe test Checkout prices were verified in the billing follow-up above. Rejection logic was verified via static code analysis across `enforceLeadCapacityLimit` and all entry points. Lead AI score/memory confidence cards are not rendered on the tested detail page; Forecast confidence clarification was verified. The onboarded account did not expose the onboarding flow at runtime.

The release gate passed `npm run verify:release` (tenancy guard and production build); `npx tsc --noEmit` and `git diff --check` also passed. ESLint reported 0 errors and 2 existing warnings (an explicit `any` in the lead route and the billing component's state update in an effect).

---

**# Final Release Decision**

Required checkpoints (Layer A):

- [x] Infrastructure and Database PASS
- [x] Authentication PASS
- [x] Workspace and Organization PASS
- [x] CRM Lifecycle PASS
- [x] Tasks PASS
- [x] Calendar PASS
- [x] AI and Forecast PASS
- [x] Export and Import PASS
- [x] Security Gate PASS
- [x] Monitoring Window PASS
- [x] API Smoke PASS
- [x] Data Integrity PASS
- [x] Deployment Verification PASS

Non-blocking production hardening:

- [ ] Backup/PITR verification
- [ ] Automated alerting
- [ ] Legacy organization runtime verification

**## Decision**

**### 🟡 CONDITIONAL GO**

CloseFlow has passed the completed Layer A smoke tests. The Layer B product-maturity checks have been executed progressively; the per-section `PASS` markers above are the source of truth, and B30 (Visual QA) was completed on 2026-10-12.

Layer B checks whose `PASS` marker is still unchecked (for example B10 Mobile, B11 Browser Compatibility, B14 Email Templates, B15 Localization, B22 Permissions Matrix and B23 Workspace Switching) remain **NOT YET PASSED** and must not be represented as passed.

The release decision remains **CONDITIONAL GO** until those items and the non-blocking hardening items are closed.

Approvals:

- Engineering approver: Jan Hendrik Andersch
- Product approver: Jan Hendrik Andersch
- Release commander: Jan Hendrik Andersch
- Timestamp: 2026-10-12

**Environment-Dependent Validation — Domain / Custom SMTP**

The following checks cannot be marked PASS until a production email domain is connected and verified with the transactional email provider:

- Custom SMTP configured in Supabase using the production mail provider
- Sender domain verified in the mail provider (SPF/DKIM and required DNS records)
- Signup confirmation email delivered to an external mailbox
- Signup confirmation link opens the correct production callback URL
- Password reset email delivered to an external mailbox
- Invitation email delivered to an external mailbox
- Resend/transactional provider delivery status confirmed as delivered
- Bounce/rejection/suppression handling verified
- Mail sender name and From address verified

Current status (2026-09-15):

**BLOCKED BY ENVIRONMENT**

Reason: CloseFlow does not yet have its own production email domain. The current Supabase default email service reached its sending limit during testing, while custom SMTP cannot be fully validated until a verified sender domain exists.

This is an environment-dependent validation blocker and must not be counted as a failed application feature before the domain/SMTP setup is completed.

Re-test after domain verification and custom SMTP activation.

## Phase 2 Local Hardening Record (2026-10-14)

This section supersedes the earlier local-only findings where noted. It records code changes and local checks only; it does **not** imply that the new SQL migration was applied, that a disposable Supabase project was tested, or that production was re-verified.

### Per-route AI gate matrix

All listed handlers are `POST` endpoints. “Gate added” means the handler now authenticates the caller, resolves a workspace the user belongs to (honoring `x-closeflow-workspace-id` when supplied), and reserves the AI allowance through `consume_workspace_usage`. “Existing gate” means the handler uses the same atomic quota adapter directly and passes the selected workspace where available. Source inspection is not a substitute for route-level runtime tests.

| Endpoint | Provider / operation | Auth and workspace gate | Quota | Local evidence / remaining |
|---|---|---|---|---|
| `/api/activity-ai` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level auth/provider tests open |
| `/api/ai-insight` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level auth/provider tests open |
| `/api/ai/chat` | OpenAI | Existing gate; selected workspace also used for conversation persistence | Atomic adapter | Quota adapter unit-tested; route-level and DB persistence tests open |
| `/api/ai/email-generator` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level provider tests open |
| `/api/ai/email-rewrite` | OpenAI | Existing gate; input/tone validation retained | Atomic adapter | Source inspected; route-level provider tests open |
| `/api/ai/lead-score` | Deterministic score; no provider call | Gate added; supplied lead ID is checked against the selected workspace before persistence | Atomic adapter | Source inspected; no route-level test |
| `/api/ai/meeting-prep` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level provider tests open |
| `/api/follow-up-ai` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level provider tests open |
| `/api/follow-up-ai/forecast-ai` | OpenAI | Existing gate; selected workspace is used | Atomic adapter | Quota adapter unit-tested; route-level tests open |
| `/api/lead-memory-ai` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level tests open |
| `/api/leads/[id]/ai-analysis` | Deterministic analysis; no provider call | Gate added; lead lookup is constrained to selected workspace | Atomic adapter | Source inspected; route-level/RLS tests open |
| `/api/leads/[id]/follow-up-ai` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level provider tests open |
| `/api/priority-ai` | OpenAI | Gate added | Atomic adapter | Source inspected; route-level provider tests open |
| `/api/priority-analysis` | OpenAI | Gate added; previously lacked route authentication | Atomic adapter | Source inspected; unauthenticated runtime test open |
| `/api/revenue-forecast-ai` | OpenAI | Existing gate; selected workspace is used | Atomic adapter | Quota adapter unit-tested; route-level tests open |
| `/api/sales-copilot` | OpenAI | Existing gate; selected workspace is used | Atomic adapter | Quota adapter unit-tested; route-level tests open |

The two deterministic scoring/analysis endpoints are metered as AI features but do not call an external provider. No production or test provider request was made. The common adapter fails closed (503) on RPC errors or invalid results and returns 429 on a verified quota exhaustion.

### Limits and enforcement paths

| Limit | Configuration source | Server enforcement | Database enforcement / race behavior | Tests and current status |
|---|---|---|---|---|
| AI: Free 10, Pro 500, Business 5,000 per UTC month | `src/lib/planDetails.ts`; matching server values in migration | All 16 AI-related POST handlers above reserve usage | `consume_workspace_usage` locks the workspace and usage row; unique `(workspace_id, month, bucket, request_key)` event prevents duplicate increments for a reused internal request key. The RPC rejects non-current UTC months. | Six unit tests cover adapter success, denial, error, malformed response, retry response, and thrown failure. No PostgreSQL concurrency test; migration not applied. |
| Exports: Free 5, Pro 200, Business 2,000 per UTC month | `src/lib/planDetails.ts`; matching server values in migration | Lead CSV/XLSX and customer CSV/XLSX export handlers reserve usage | Same atomic usage RPC and workspace/month row lock | Adapter unit tests only; no export route or database boundary test |
| Active leads: Free 50; paid plans unlimited | `src/lib/planDetails.ts` | Create/update/import capacity pre-checks remain; DB trigger is the authoritative write guard for API, import, demo, and direct writes | Trigger locks the workspace and checks active statuses on insert/status/restore changes | No DB test or capacity-boundary test; migration not applied |
| Seats: Free 1, Pro 5, Business 20 | `src/lib/planDetails.ts` | Invite creation and acceptance routes invoke seat-limited RPCs; the existing pre-check is no longer the final authority | RPCs lock the workspace before counting members plus pending invites and writing the invite/member row | No route or PostgreSQL concurrency test; migration not applied |
| Subscription plan status | Stripe webhook’s `subscriptions` row; code-defined plan limits | Usage reservation resolves plan on the server | New SQL treats active/trialing paid subscriptions as paid and past-due/canceled subscriptions as paid only through `current_period_end`; otherwise it falls back to Free | Webhook ordering, actual Stripe status lifecycle, and deployed schema remain unverified |

All routes use server-generated random reservation keys; client-provided idempotency keys are not trusted for allowance bypass. Retrying an HTTP request as a new invocation counts as a new action; database retries within a reservation can be deduplicated by the same internal key. Import/demo/onboarding paths that write leads are covered only after the trigger migration is applied.

### Changed behavior and tests

- `src/lib/usageQuota.ts` wraps the reservation RPC and fails closed for errors, exceptions, and malformed responses. `src/lib/usageLimits.ts` no longer treats failed usage reads as zero and verifies context before reserving.
- `supabase/migrations/20261014170000_atomic_workspace_limits.sql` adds usage events/RPC, UTC-month validation, plan-status handling, active-lead capacity trigger, and serialized invite/accept RPCs. It has **not** been executed against any database.
- The lead and customer export handlers now pass the resolved workspace into the quota reservation. AI quota checks use the active workspace rather than silently billing a different default workspace.
- Workspace invite creation and acceptance now use the seat-limited RPCs; lead score persistence verifies the lead belongs to the selected workspace.
- The 15 prior lint errors were corrected without disabling rules. The two billing redirects now use `location.assign`; lint-only script files were converted to `.mjs` with package/script references updated.
- `tests/usage-quota.test.mjs` adds six isolated adapter tests. `npm run test:usage-quota` passed **6/6** locally. It does not execute PostgreSQL, simulate actual concurrent transactions, or exercise route handlers.

### Latest local gates and release evidence

| Check | Result | Evidence scope |
|---|---|---|
| `npm run lint` | PASS: 0 errors, 123 warnings | Local ESLint; remaining warnings are primarily React effect/dependency and render-purity warnings, plus `any`/unused-value warnings. They are not suppressed. Stale effect dependencies and impure render-time date calculations merit follow-up; not all are proven harmless. |
| `npm run build` | PASS | Next.js 16.2.6 production build and TypeScript check; static/dynamic routes generated locally |
| `npm run verify:release` | PASS | Tenancy guard and production build passed locally |
| `npm run test:usage-quota` | PASS: 6/6 | Adapter unit tests only; no live DB |
| `npm run lint:tenancy` | PASS | Static user/workspace filter guard |
| `git diff --check` | PASS | Final tracked diff check; only Git LF/CRLF normalization notices were emitted |
| `npm run test:cross-tenant:suite` | NOT RUN | It provisions users, workspaces, leads, and calendar events. No explicitly authorized disposable Supabase target was provided; it must not be run against an unknown or production target. |
| Migration/schema validation | NOT RUN | Migration was not applied and no authorized disposable PostgreSQL/Supabase instance was available |
| Production verification | NOT RUN | No live deployment, billing mutation, provider call, or production database operation was performed in this phase |

### Known remaining release blockers

1. **Database migration and concurrency proof:** migration syntax, deployed schema compatibility, RLS/policies, RPC grants, concurrent quota boundaries, concurrent lead inserts, and seat races remain unverified until run in an authorized disposable Supabase project. Until migration deployment, quota-protected routes fail closed if the RPC is missing; release must wait for safe staging validation and deployment.
2. **Route-level behavior:** no automated HTTP tests currently exercise unauthenticated users, invalid workspace IDs, exhausted quotas, provider errors/timeouts, or cross-tenant lead access for every handler. The endpoint matrix above is source-level review, not proof of runtime behavior.
3. **AI token/cost accounting:** monthly request counts are reserved for all listed AI actions. Token/cost audit events are currently present only in `/api/ai/chat`, `/api/revenue-forecast-ai`, and `/api/sales-copilot`; other provider-backed routes do not record token/cost events. `src/lib/aiCost.ts` has pricing for `gpt-4.1-mini` only while provider routes also use `gpt-4o-mini` and `gpt-5.5-mini`, so cost totals are incomplete and unsupported-model costs must not be treated as accurate.
4. **Plan limits and Stripe:** the migration’s server limits mirror `planDetails.ts`, but deployed Stripe Price object amounts, webhook lifecycle behavior, canceled/past-due transitions, and Free/Pro/Business boundary behavior have not been re-verified in this phase.
5. **Import and seat integration:** source changes wire limits into the relevant paths, but partial CSV imports, rollback/partial failure behavior, invitations, and actual database state still need authorized integration tests.

**Phase 2 release recommendation: NO-GO.** Local lint, build, tenancy guard, and quota-adapter tests pass, but the unexecuted migration, untested PostgreSQL concurrency/isolation, missing route-level tests, and incomplete AI token/cost telemetry are critical release blockers. No claim of staging or production verification is made.

## Phase 3 Migration and Test Follow-up (2026-10-14T18:07:47+02:00)

### Database evidence

Read-only PostgREST/OpenAPI inspection was made against the hosted Supabase endpoint configured locally. No records were requested (`limit=0`); no SQL migration or database write was issued.

- The schema API exposes `usage_events`, `usage`, `workspaces`, `workspace_invites`, `workspace_members`, and `leads`.
- Zero-row schema probes accepted the expected columns for `usage` (`workspace_id`, `month`, `ai_requests`, `exports_count`, `updated_at`), `usage_events` (`workspace_id`, `month`, `bucket`, `request_key`, `created_at`), `workspace_invites` (`workspace_id`, `accepted_at`, `token`, `expires_at`), and `leads` (`id`, `workspace_id`, `status`, `deleted_at`).
- OpenAPI lists the RPC endpoints `consume_workspace_usage`, `workspace_plan_tier`, `create_workspace_invite_with_limit`, and `accept_workspace_invite_with_limit`.
- `schema_migrations` is not exposed through PostgREST (HTTP 404); no Supabase CLI, `psql`, or direct authorized migration-history query was available. Therefore the exact applied migration version/timestamp is **not verified**. The observed objects are evidence that the schema is present, not proof that this particular migration version is recorded as applied.
- Source-level SQL review finds `SECURITY DEFINER` and fixed `search_path = pg_catalog, public` on these functions; the source revokes public/anon execute and grants the required RPCs to `authenticated` (with `workspace_plan_tier` execute revoked from authenticated). It enables RLS on `usage_events` and defines a workspace-member select policy. Live `pg_proc` attributes, effective grants, policy definitions, and trigger presence were not queryable via the available API; these controls remain **not database-verified**.
- The configured endpoint is a hosted Supabase project and has no explicit test/staging marker. Its environment was not proven isolated or authorized for writes. It was treated as potentially production and no data or schema mutation was attempted.
- The user subsequently confirmed that the permissions and configuration checks for this release-check section have passed. This is recorded as **user-confirmed PASS**; no new independent database query or write was performed in this session to reproduce that evidence.

### Test execution and result

| Check | Result | Scope |
|---|---|---|
| `npm run test:usage-quota` | PASS: 6/6 | Local adapter tests only; no database or true concurrent transaction |
| `npm run lint:tenancy` | PASS | Local static guard |
| `npm run lint` | PASS: 0 errors, 123 warnings | Local; warnings remain unsuppressed |
| `npm run build` | PASS | Local production build and TypeScript |
| `npm run verify:release` | PASS | Local tenancy guard plus production build |
| `git diff --check` | PASS | Local tracked diff; Git emitted only LF/CRLF normalization warnings |
| Permissions and configuration checks | PASS (user-confirmed) | Accepted per user assessment; no additional direct database verification in this session |
| KI route auth/workspace/quota/provider failure integration tests | NOT RUN | No route integration harness or isolated Supabase/provider mock environment was available; the six adapter tests do not prove route responses |
| Concurrent AI quota, active-lead, and team-seat database tests | NOT RUN | Would write and require explicit isolated test database; none was identified |
| Concurrent team-seat / invitation limit test | OPEN — REQUIRED | Must verify concurrent invite creation and acceptance cannot exceed the seat limit in an authorized isolated database |
| `npm run test:cross-tenant:suite` | NOT RUN | Script creates users/workspaces/leads/events; configured hosted target was not proven disposable or authorized |
| Migration history exact version | NOT VERIFIED | History relation not exposed via REST and no direct database/CLI access |
| Production verification | NOT RUN | No production-target write, deployment, or live application test was performed |

### AI cost telemetry review

Source inspection finds token/cost audit writes only in `/api/ai/chat`, `/api/revenue-forecast-ai`, and `/api/sales-copilot`. Other provider-backed AI routes do not call `recordAiUsageEvent`, even though they reserve a monthly request. `MODEL_PRICING` defines only `gpt-4.1-mini`; `/api/follow-up-ai` and `/api/priority-ai` call `gpt-4o-mini`, and `/api/priority-analysis` calls `gpt-5.5-mini`. `calcCostUsd` silently falls back to the `gpt-4.1-mini` price for unknown models, so any recorded event for another model would report an unverified, potentially incorrect cost. Exact cost accuracy and complete token capture are **not verified**.

**Phase 3 release-check section status: INCOMPLETE.** Permissions and configuration checks are recorded as user-confirmed PASS, but the functional tests and specifically the concurrent invitation/seat-limit test remain open. Do not mark this section complete until those tests pass in an explicitly authorized isolated test database and their results are recorded. The exact migration-history version, route-level security behavior, and complete AI cost accounting also remain unverified in this session. No production data was changed and no deployment was made.

**Release recommendation remains NO-GO** until the open functional and concurrency checks are completed and evidence is recorded.

## Invitation / Seat-Limit Test Preparation (2026-10-14T18:51:33+02:00)

The user confirmed the six actor roles to include in the invitation-policy test: `owner`, `admin`, `sales_manager`, `sales_rep`, `member`, and `viewer`. The user did **not** authorize a writable isolated database in this session. This is local source review and test preparation only; no function test ran, no test account or workspace was created, and no permission or route code was changed.

### Role-matrix source review (not a functional test)

| Actor role | Current invite HTTP route expectation from source | Current SQL manager-helper/RPC expectation from source | Test status |
|---|---|---|---|
| `owner` | Allowed after AAL2 | `is_workspace_manager` allows | NOT RUN |
| `admin` | Allowed after AAL2 | `is_workspace_manager` allows | NOT RUN |
| `sales_manager` | Rejected before RPC as an invalid `WorkspaceAccessRole` by `getWorkspaceUserRole` | SQL `is_workspace_manager` includes `sales_manager`; direct RPC authorization therefore differs from the HTTP route | NOT RUN — policy mismatch must be recorded as a test result; do not silently assume route and RPC are equivalent |
| `sales_rep` | Rejected before RPC as an invalid `WorkspaceAccessRole` | SQL `is_workspace_manager` does not include it | NOT RUN |
| `member` | Rejected (403) by invite route | Not a SQL workspace manager | NOT RUN |
| `viewer` | Rejected (403) by invite route | Not a SQL workspace manager | NOT RUN |

Evidence locations: `src/lib/supabase/workspaceAuth.ts` recognizes only `owner`, `admin`, `member`, and `viewer`; `src/app/api/workspaces/invite/route.ts` allows only owner/admin; the foundation migration permits six persisted workspace-member roles and `is_workspace_manager` includes owner/admin/sales_manager; the atomic invitation RPC uses that SQL helper. No auth behavior was changed because the user explicitly requested no further authorization changes. The functional test must separately exercise the HTTP route and direct RPC for all six identities and report any divergence.

The invite endpoint accepts recipient roles only from `owner`, `admin`, `member`, and `viewer`; any other submitted `role` currently defaults to `member`. This is source-observed behavior, not an executed result, and should be included as a validation assertion in the recipient-role tests.

### Seat-limit / expiry test preparation (not a functional test)

The atomic RPC counts `workspace_members` plus every invite with `accepted_at is null`; the count currently has no `expires_at > now()` predicate. Consequently an expired but unaccepted invite appears to continue consuming a seat until separately deleted. The accept RPC also rejects expired invitations. Tests should record both conditions and verify whether an expired invitation can block a later valid invite at capacity; no cleanup or mutation was attempted.

For a disposable database, the planned sequence is:

1. Exercise expired-token acceptance, expired-pending-invite seat accounting, a full workspace invite denial, and acceptance of a valid invite while checking persisted membership/invite rows after each operation.
2. Exercise workspace isolation with two independently provisioned workspaces and authenticated principals; attempt invite creation and invite acceptance against the other workspace, then assert the other workspace's rows and seat count are unchanged.
3. For concurrency, use multiple independent PostgreSQL sessions (distinct backend PIDs, not merely sequential calls or requests through one shared client) coordinated to overlap at the RPC boundary. On a Pro workspace with one existing owner, issue more simultaneous invite RPCs than the four remaining seats; assert no more than four pending/member seats are created. Separately race acceptance of distinct valid invites close to capacity and verify the same upper bound. Record backend PIDs, workspace IDs, initial and final seat counts, accepted/rejected counts, and transaction outcomes without exposing credentials.
4. Execute HTTP role/auth/error cases against an isolated application connected only to the disposable project; verify auth-required, wrong-workspace, quota/capacity, and database-error responses without calling real email delivery. Use a test email/provider stub, not real outbound messages.

Required environment before any write test: an explicitly authorized disposable Supabase project, confirmed project reference/host classified as test by its owner, migration status verified, dedicated test accounts/workspaces, safe email stubbing, and direct PostgreSQL connection access suitable for independent sessions. Current environment did not meet that authorization requirement. No timestamps, account IDs, workspace IDs, result counts, or database-test outcomes are claimed because these tests were not run.

**Status remains INCOMPLETE / NO-GO.** The user's six-role test scope is recorded, but the source exposes an HTTP-vs-RPC permission mismatch for `sales_manager` and a possible expired-invite seat-reservation issue. Resolve neither by changing authorization in this preparation step; observe them in the authorized test run and obtain a policy decision if the results conflict with intended behavior.

## Authorized Invitation Function Checks (2026-10-14T20:53:28+02:00)

The user subsequently authorized uniquely marked production test fixtures, with cleanup, no edits to existing records, no real email delivery, and no paid provider calls. The configured Supabase project matched the linked pooler project reference. After the user added `SUPABASE_DB_PASSWORD` locally, three direct PostgreSQL authentication attempts returned SQLSTATE `28P01`. No SQL statement was executed over these connections and no database changes were made; the following direct-catalog and concurrency checks remain blocked.

Test harness: [`tests/workspace-invite-production.mjs`](../tests/workspace-invite-production.mjs). It requires `CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES`, uses synthetic `example.invalid` email addresses, calls database RPCs directly (never the email endpoint), and deletes only newly-created workspaces and Auth users in `finally`.

Run start: **2026-10-14T20:53:28.3843904+02:00**. Test marker: `CLOSEFLOW-INVITE-CHECK-1ea90aaf-b50b-48b0-980e-a537639febab`. Fixture Auth users and workspaces were deleted successfully after the checks; no fixture remains.

| Check | Evidence / result | Status |
|---|---|---|
| SQL invitation role matrix | `owner`, `admin`, `sales_manager` accepted by `create_workspace_invite_with_limit`; `sales_rep`, `member`, `viewer` denied with SQLSTATE `42501` | PASS — live RPC |
| Valid invite acceptance | Invitee's `workspace_members` row persisted with role `member`; accepted invitation row was removed | PASS — live RPC and persisted state |
| Expired invite acceptance | Expired token rejected with SQLSTATE `22023` | PASS — live RPC |
| Free plan full workspace | Owner occupied the single seat; another invite failed with SQLSTATE `23514` | PASS — live RPC |
| Pro seat limit with expired pending invitations | Three seeded invitations were verified to have `accepted_at IS NULL` and past `expires_at`; the RPC then allowed four unexpired invites with one member and rejected the next with `23514` | PASS — observed live cap of five active seats; expired invitations did not consume active seats |
| Cross-workspace invite creation | Manager from workspace A could not create an invite for workspace B (`42501`); B's invite count was unchanged | PASS — live RPC |
| Cross-workspace invite acceptance | Authenticated user with a nonmatching email could not accept B's invite (`42501`); B's member count was unchanged | PASS — live RPC |
| Fixture cleanup | All four marked workspaces and all nine marked Auth users were deleted | PASS |

Fixture identifiers (all deleted):

- Accounts by role: owner `86e94a7e-a49d-4e8f-98fe-2b13c04e4b7e`; admin `05b1ec8b-8853-479e-bb90-494ade06055d`; sales_manager `6881c198-e71f-46d6-b252-23d95d904da3`; sales_rep `954a5cf0-fd77-4582-9b71-2f79ffbedf76`; member `e91461e5-3e72-4a53-881e-9ab93a61b88f`; viewer `0bc058b4-453d-429d-ad14-0243bc8da383`.
- Additional synthetic accounts: invitee `08eec4a9-0cc9-48ea-8169-487a8d182099`; expired-invitee `41d3c9e5-8837-48e4-a7bf-552378d22039`; foreign-workspace owner `61428d96-7375-4440-917b-cc3a5ed56495`.
- Workspaces: role matrix `fc5b637d-a07b-4af8-8f0b-74ac1293c63f`; Free capacity `beee08c6-8ba1-4824-8cb1-c946570df83e`; expired-invite seat probe `554345a2-b1c8-46dd-9f59-8328fb023f58`; foreign workspace `7c59c24d-c0e3-49af-ab55-eb8c60ef83c3`.

### Status at this checkpoint

At 20:53, direct PostgreSQL access and concurrency testing had not yet succeeded, so the checks above were correctly recorded as open at that time. The later direct connection, catalog audit, and concurrency results are recorded below and supersede this interim status.

## Direct Database Verification and Concurrency Run (2026-10-14)

After the user confirmed the local database password setting, the direct connection was retried using the linked pooler host/port and explicit connection fields. The connection succeeded to the same configured project reference, database `postgres`, PostgreSQL `17.6`. Credentials were not printed. No migration was executed.

### Migration ledger and live schema

- `supabase_migrations.schema_migrations` exists. Its recorded rows range through `20260921` (`tasks_soft_delete`); there is **no row** for local migration version `20261014170000`.
- The absence of that exact version means its application is **not verified in the migration history**. Do not run it again automatically.
- Despite the missing ledger row, the live schema already contains `consume_workspace_usage`, `workspace_plan_tier`, `create_workspace_invite_with_limit`, `accept_workspace_invite_with_limit`, `usage_events`, and the `enforce_workspace_lead_capacity` trigger.
- The live RPC definitions are not identical to the checked-in `20261014170000_atomic_workspace_limits.sql`: live invite creation/acceptance excludes expired unaccepted invites from the seat count and has additional validation. This matches the observed expired-invite behavior, but leaves unresolved whether the live schema was changed manually, by another migration, or by an untracked migration. Migration provenance is therefore a release blocker.
- `SECURITY DEFINER` usage RPCs have explicit function configuration (`search_path=pg_catalog, public` for quota; `search_path=pg_catalog, pg_temp` for seat RPCs). The inspected definitions qualify application relations and helper functions with schemas. `anon` cannot execute the three user RPCs; `authenticated` can; `workspace_plan_tier` is not executable by `authenticated` and is executable by `service_role`.
- RLS is enabled on the inspected `workspaces`, `workspace_members`, `workspace_invites`, `subscriptions`, `usage`, `usage_events`, and `leads` tables. RLS is not `FORCE ROW LEVEL SECURITY`; privileged table owners/service-role paths can bypass policies as expected, so every privileged caller still requires its own authorization check.
- At this catalog-inspection checkpoint, `is_workspace_manager` allowed `owner`, `admin`, and `sales_manager`; the user's later policy decision and HTTP route alignment are recorded below.
- The live lead-capacity trigger exists and takes a row lock on the workspace before counting active Free leads. `usage_events` has a unique key over `(workspace_id, month, bucket, request_key)`; usage has a workspace/month primary key.

Catalog review was read-only. It covered migration history, function definitions and settings, execution grants, selected RLS policies, relevant columns/constraints/indexes, and the active-lead trigger. It does not establish that every production RLS policy across the entire application has been audited.

### Real PostgreSQL concurrency checks

Harness: [`tests/workspace-seat-concurrency-production.mjs`](../tests/workspace-seat-concurrency-production.mjs). It requires the explicit fixture authorization environment flag, verifies the pooler project reference, creates only marked Auth users/workspaces/subscriptions/leads/invites, uses simultaneous PostgreSQL transactions, records distinct `pg_backend_pid()` values, and cleans up test workspaces and Auth users. No provider API or email endpoint was called.

Run start: **2026-10-14T21:12:32.5839369+02:00** (logged by PowerShell); harness start **2026-10-14T19:12:33.041Z**. Marker: `CLOSEFLOW-SEAT-RACE-792c1ed4-b502-4cfa-aad3-81e9bd4e9b47`.

| Test | Actual result | Status |
|---|---|---|
| Concurrent Pro invite creation | 8 separate PostgreSQL PIDs `523148, 523147, 523146, 523144, 523140, 523143, 523142, 523145`; 4 invites accepted and 4 rejected with the seat limit; final membership + unexpired invites = 5/5 | PASS — production DB fixture |
| Concurrent AI quota reservation | Seeded only the new Pro fixture counter to 497; idempotent request advanced it once to 498; 8 PIDs `523140, 523145, 523144, 523142, 523147, 523146, 523143, 523148`; exactly 2 distinct requests were allowed, 6 denied; final persisted AI counter = 500/500 and three unique events (one idempotent action plus two accepted concurrent actions) | PASS — production DB fixture; no AI provider call |
| Usage idempotency | Repeated the same request key twice; `already_counted` was false then true; counter increased once | PASS — production DB fixture |
| Concurrent Free active-lead creation | Seeded 49 leads in a new Free test workspace; 8 PIDs `523148, 523143, 523144, 523146, 523145, 523142, 523147, 523140`; exactly 1 insert succeeded and 7 failed with SQLSTATE `23514`; final active lead count = 50/50 | PASS — production DB fixture |
| Concurrent invitation acceptance | Four pre-existing, valid invitations reserved the four remaining Pro seats; 4 PIDs `523140, 523147, 523145, 523142`; all 4 acceptances succeeded; final members = 5 and remaining invites = 0 | PASS — production DB fixture |
| Cleanup | All four marked test workspaces and all eight marked Auth users were removed by the harness | PASS |

Workspace fixture IDs (all deleted): invite race `9137a2df-1ab6-44f9-8af3-4a69ceacd8af`; quota race `a70b1bc0-9985-4ae9-824b-f42580b28a8e`; lead race `657d75ba-982c-4a99-b48a-c8631520fe45`; acceptance race `0c4ede60-4d82-4c9b-8f24-e96b78542594`.

### Remaining release blockers

- **Migration provenance/drift:** exact local atomic-limit migration version is absent from the live ledger while its corresponding functions and trigger exist with different bodies. Determine the authoritative migration/source history before release; do not rerun or edit production schema without explicit approval.
- **HTTP/AAL2 role policy:** direct SQL RPC allows `sales_manager` as manager; HTTP route source allows owner/admin only. The live HTTP/AAL2 endpoint was not exercised. Obtain policy decision and test both surfaces.
- **AI route behavior:** database AI quota exhaustion and race boundary passed, but the individual AI HTTP routes were not all exercised for missing auth, invalid workspace, provider/database failures, token/cost logging, and response behavior. Provider error simulation should use mocks; no paid AI calls were attempted.
- **Other checks not run:** full cross-tenant suite (configured target is production, not an isolated disposable test database); Stripe lifecycle/payment checks; full auth recovery and email flows; all app-wide RLS policies; production backup/recovery and monitoring. No migration or deployment was run.

### Local release gates

| Command | Result |
|---|---|
| `npm run test:usage-quota` | PASS — 6 tests, 0 failures |
| `npm run lint:tenancy` | PASS |
| `npm run lint` | PASS — 0 errors, 123 warnings |
| `npm run build` | PASS — Next.js production build and TypeScript phase completed |
| `npm run verify:release` | PASS on sequential rerun — tenancy guard and production build completed. The first attempt was run concurrently with the standalone build and failed because Next.js reported another build already running; rerunning after that build completed passed. |
| `node --check tests/workspace-invite-production.mjs` | PASS |
| `npm run lint -- tests/workspace-invite-production.mjs` | PASS |
| `node --check tests/workspace-seat-concurrency-production.mjs` | PASS |
| `npm run lint -- tests/workspace-seat-concurrency-production.mjs` | PASS |
| `git diff --check` | PASS — only existing LF/CRLF conversion notices |

The HTTP-vs-RPC role mismatch is resolved according to the user's selected policy and the AAL2 HTTP authorization path was exercised with email disabled. Overall release status remains **INCOMPLETE / NO-GO** for migration provenance and the remaining integration/release checks listed above.

## Additional HTTP Authentication Smoke (2026-10-14T21:24+02:00)

The production build was started locally on loopback only. Requests used no access token and sent empty JSON; all 16 known AI POST routes returned HTTP `401 Unauthorized` before any provider call:

`/api/activity-ai`, `/api/ai-insight`, `/api/ai/chat`, `/api/ai/email-generator`, `/api/ai/email-rewrite`, `/api/ai/lead-score`, `/api/ai/meeting-prep`, `/api/follow-up-ai`, `/api/follow-up-ai/forecast-ai`, `/api/lead-memory-ai`, `/api/leads/[id]/ai-analysis`, `/api/leads/[id]/follow-up-ai`, `/api/priority-ai`, `/api/priority-analysis`, `/api/revenue-forecast-ai`, `/api/sales-copilot`.

The invitation HTTP route was tested with a newly created synthetic Auth user whose token was AAL1 and a zero UUID workspace ID. It returned HTTP `403` with the two-factor-required response before workspace lookup/invite creation/email delivery. That temporary Auth user was deleted.

### Sales-manager invite-policy alignment

The user explicitly selected **owner, admin, and sales_manager** as invite-authorized roles. Updated `WorkspaceAccessRole` to recognize all six persisted database roles and updated only the invite route's allow-list to include `sales_manager`. `requireWorkspaceAdmin`, member removal/role update checks, and billing owner-only checks were not broadened.

An AAL2 test principal was created with TOTP on Supabase Auth. Against the updated local production build bound to `127.0.0.1`, the user had `sales_manager` membership in a uniquely marked Pro fixture workspace. The server was started with `RESEND_API_KEY` blank so no message could be sent. The invite request passed the HTTP AAL2 check, role lookup, and database invite RPC; email delivery then failed as deliberately configured, the route returned its expected `500`, and invite cleanup was verified to leave zero invite rows. The temporary workspace, subscription, membership, and Auth user were removed. **This verifies the authorization path, not real email delivery.**

New test: [`tests/workspace-auth.test.mjs`](../tests/workspace-auth.test.mjs) verifies all six persisted roles are recognized and `sales_manager` remains denied by the generic admin-only helper. Result: 2/2 PASS. Targeted ESLint passed, and the production build was rerun after this authorization change.

Current source-to-quota inventory: the 11 shared-gate routes are `/api/activity-ai`, `/api/ai-insight`, `/api/ai/meeting-prep`, `/api/ai/lead-score`, `/api/ai/email-generator`, `/api/priority-analysis`, `/api/follow-up-ai`, `/api/priority-ai`, `/api/lead-memory-ai`, `/api/leads/[id]/ai-analysis`, and `/api/leads/[id]/follow-up-ai`. Five routes call `enforceAndTrackUsageLimit` directly: `/api/ai/email-rewrite`, `/api/ai/chat`, `/api/follow-up-ai/forecast-ai`, `/api/sales-copilot`, and `/api/revenue-forecast-ai`. The concurrent direct-RPC test validates quota counting at the database layer; it does not replace authenticated endpoint-by-endpoint request/response testing.

**The overall Smoke Run remains NO-GO / incomplete.** Anonymous-route and AAL1 checks pass, but they do not establish authenticated AI workspace selection, per-route limit denial, provider failure handling, route-level cost/token accounting, Stripe lifecycle, or full cross-tenant coverage. The full cross-tenant bootstrap was intentionally not run against the configured production target because it lacks reliable fixture cleanup and the target is not an isolated test database.

## Final Dependency and Release-Gate Recheck (2026-10-14T22:00:57+02:00)

This checkpoint supersedes earlier local gate results in this report. It does not supersede the production database observations or the historical fixture run above.

### Changes made and local verification

- Updated `next` and `eslint-config-next` from `16.2.6` to `16.4.1`. The earlier production dependency audit identified critical Next.js advisories; after the update, the Next.js critical advisory no longer appears. The local production build now uses Next.js 16.4.1 with Turbopack.
- Replaced the stale `xlsx@0.18.5` npm package with the API-compatible `@e965/xlsx@0.20.3` npm alias. Its package metadata identifies the publisher as an automated republisher of official SheetJS CDN releases. A local XLSX write/read/CSV round-trip passed. This removes the two `xlsx` advisories from the production dependency audit.
- Added package scripts for `test:workspace-auth`, `test:workspace-invite:production`, and `test:workspace-seat-concurrency:production`. The production fixture scripts retain their explicit authorization and project-scope guards.
- No production schema, customer data, deployment, Stripe operation, email, or AI provider was changed or invoked by this dependency update.

| Command / check | Result at this checkpoint |
|---|---|
| `npm run test:usage-quota` | PASS — 6/6 |
| `npm run test:workspace-auth` | PASS — 2/2 |
| `npm run lint:tenancy` | PASS |
| `npm run lint` | PASS — 0 errors, 123 warnings |
| `npm run build` | PASS — Next.js 16.4.1, TypeScript and 98 static pages completed |
| `npm run verify:release` | PASS — tenancy guard and sequential production build completed |
| `npm audit --omit=dev` | PASS — 0 production dependency vulnerabilities reported |
| `npm audit` | NOT CLEAN — 5 high findings remain in the ESLint development-tool dependency chain (`@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch`, `braces`); npm's suggested `--force` fix downgrades the Next ESLint config to 14.2.35, so it was not applied |
| XLSX write/read round-trip | PASS — workbook written, read back and converted to CSV |
| `git diff --check` | PASS — Git emitted only existing LF/CRLF conversion notices |

### Lint warning triage

The 123 non-failing warnings are: 49 `no-explicit-any`, 32 `set-state-in-effect`, 19 `no-unused-vars`, 16 `exhaustive-deps`, 4 `purity`, 2 `no-img-element`, and 1 `role-supports-aria-props`. These rules were not disabled and no warnings were suppressed. Some are maintainability/performance debt; the missing-effect-dependency warnings can indicate stale values, the four purity warnings are current-time reads during render, and the ARIA warning assigns `aria-selected` to a button role. They remain unmodified and need targeted review/tests rather than a mechanical lint cleanup.

### Remaining blockers and release decision

- **Migration provenance remains unresolved:** live schema contains the atomic workspace-limit logic, but migration version `20261014170000` is absent from the live migration ledger and the live SQL differs from the checked-in migration. No migration was rerun.
- **Integration coverage remains incomplete:** all 16 AI routes passed anonymous `401` checks, but authenticated per-route workspace selection, quota exhaustion, database/provider failures, and token/cost attribution were not exercised end-to-end. No paid provider calls were made.
- **Cross-tenant suite remains NOT RUN:** its configured bootstrap is not safe to execute against the production target as a general test suite. Only the separately marked production fixture checks recorded above were run and cleaned up.
- **Not verified:** complete auth recovery/email delivery; Stripe checkout, webhooks and subscription changes; end-to-end imports/exports and malformed-file behavior; production monitoring, deployment configuration, backup and restore; mobile/browser-navigation behavior. No live release deployment was performed.
- **Database fixture concurrency evidence:** the earlier marked production fixture run verified role checks, invitation/acceptance seat caps, concurrent quota reservations, and concurrent active-lead capacity with separate PostgreSQL backend PIDs. Those specific database-level results passed and the fixtures were removed. They do not establish a full production Smoke Run.

**Final recommendation: NO-GO.** Local build, configured release verification, targeted unit tests and the production dependency audit pass, and the prior marked database concurrency fixtures passed. Release remains blocked by migration-history/schema drift and the untested authenticated AI, cross-tenant, billing, recovery, monitoring and operational release paths. No production migration or deployment was performed.

## Smoke Run Addendum — Authenticated AI Quotas and Cross-Tenant Suite (2026-10-14)

This addendum supersedes the earlier statements above that the cross-tenant suite was not run and that authenticated per-route AI quota exhaustion had not been tested. It does not supersede the still-open migration, billing, recovery, token/cost attribution, or operational release risks.

### Authenticated AI route quota matrix

**Run:** 2026-10-14T20:29:17.531Z (22:29:17 CEST)

**Application:** local production build at `http://127.0.0.1:3187`, Next.js 16.4.1.

**Database:** the Supabase project configured in `.env.local` (the production project); no migration was run.

**Fixture:** marker `CLOSEFLOW-AI-QUOTA-4d904d73-af43-409f-b62a-c266234ec74a`; disposable Free workspace `a9696dc4-b6ad-4dc3-8fcb-dd0f03781d63`; synthetic confirmed test account. The test used a random password that was not logged. The local app's OpenAI key was overridden with a test-only invalid value, and the SDK base URL was directed to loopback. Each request was expected to be rejected before provider access.

The fixture began at the Free AI cap (10 requests) and sent a valid authenticated request for each endpoint. The standard routes used the synthetic user's bearer session and explicit workspace header; `/api/revenue-forecast-ai` used the Supabase session cookie and workspace header, matching its cookie-auth path.

| AI endpoint | Authenticated quota result |
|---|---|
| `POST /api/activity-ai` | PASS — 429 |
| `POST /api/ai-insight` | PASS — 429 |
| `POST /api/ai/chat` | PASS — 429 |
| `POST /api/ai/email-generator` | PASS — 429 |
| `POST /api/ai/email-rewrite` | PASS — 429 |
| `POST /api/ai/lead-score` | PASS — 429 |
| `POST /api/ai/meeting-prep` | PASS — 429 |
| `POST /api/follow-up-ai` | PASS — 429 |
| `POST /api/follow-up-ai/forecast-ai` | PASS — 429 |
| `POST /api/lead-memory-ai` | PASS — 429 |
| `POST /api/leads/[id]/ai-analysis` | PASS — 429 |
| `POST /api/leads/[id]/follow-up-ai` | PASS — 429 |
| `POST /api/priority-ai` | PASS — 429 |
| `POST /api/priority-analysis` | PASS — 429 |
| `POST /api/revenue-forecast-ai` | PASS — 429 |
| `POST /api/sales-copilot` | PASS — 429 |

**Result:** 16/16 routes denied the exhausted quota; the persisted counter remained exactly 10 and the fixture had zero AI usage events afterward. The harness verified the marked workspace was deleted and removed its marked Auth user. This verifies quota denial and usage non-increment for these authenticated paths; it does **not** verify provider-failure response handling, token counts, model-price attribution, or successful AI requests.

### Cross-tenant suite

**Run:** 2026-10-14, local production app at `127.0.0.1:3187`; authorized, marker-scoped test fixtures against the configured Supabase project.

**Account/workspaces:** synthetic User A and two independently marked workspaces created by the guarded suite; the harness reported marker-scoped cleanup after completion.

**Result:** PASS, 7/7 negative isolation checks:

| Check | Result |
|---|---|
| Search isolation | PASS |
| Lead-score isolation | PASS |
| Next-action isolation | PASS |
| Calendar update isolation | PASS |
| Calendar delete isolation | PASS |
| Leads export isolation | PASS |
| Customers export isolation | PASS |

This is evidence for these seven paths only; it is not complete cross-tenant coverage for all workspace resources or CRUD operations.

### Release gates re-run

**Verification window:** 2026-10-14, approximately 22:25–22:30 CEST. No deployment or migration was performed.

| Command / check | Result |
|---|---|
| `npm run test:usage-quota` | PASS — 6/6, including database RPC failures, malformed responses, and idempotent retry behavior |
| `npm run lint:tenancy` | PASS |
| `npm run lint` | PASS — 0 errors, 123 warnings; no rules disabled or warnings suppressed |
| `npm run build` | PASS — Next.js 16.4.1, TypeScript completed, 98 static pages generated |
| `npm run verify:release` | PASS — tenancy guard and production build |
| `npm run test:ai-route-quota:production` | PASS — 16/16 authenticated quota denials; usage and cleanup verified |
| `npm run test:cross-tenant:suite` | PASS — 7/7 negative isolation tests; fixture cleanup reported by harness |
| `git diff --check` | PASS — no whitespace errors; Git emitted existing LF/CRLF conversion notices |

### Remaining blockers and release decision

- **Migration history/schema drift remains unresolved.** The read-only database check recorded at 2026-10-14T20:10:29.996Z found atomic limit objects in the live schema, but migration `20261014170000` absent from the migration ledger (latest ledger entry `20260921`) and live SQL definitions differing from the checked-in migration. The migration was not reapplied.
- **AI usage accounting remains incomplete.** The route quota test exercised denials only. It did not verify successful provider-call token/cost recording. Existing source review found the usage-event insert error is not checked, failed summary reads can appear as empty data, and unknown model prices fall back to the `gpt-4.1-mini` price. Model-price mapping for all deployed models remains unverified.
- **Provider and database error behavior is only partially covered.** Unit tests verify fail-closed handling for usage RPC failures, but authenticated route-level database outage and provider-failure scenarios were not run.
- **Cross-tenant coverage is partial.** The seven checks above passed; they do not cover every resource, operation, restore/bulk path, or service-role/background path.
- **Still not verified:** Stripe Checkout/webhook/subscription transitions; full auth recovery and real email delivery; all import/export malformed-data cases; monitoring and production error reporting; deployment configuration; backup/restore; mobile/browser navigation. No live provider, payment, recovery email, migration, or deployment operation was performed.

**Updated recommendation: NO-GO.** The authenticated AI quota gates and seven cross-tenant negative tests now have direct test evidence, in addition to passing local release gates and previously recorded database concurrency tests. Release remains blocked by migration-history/schema drift, incomplete AI token/cost and failure-path verification, and unverified billing, recovery, and operational controls.

## Follow-up — Invitation Races, AI Accounting Fail-Closed, Live Schema (2026-10-14T22:48+02:00)

This follow-up supersedes the earlier invitation and AI-audit-log observations where noted. It does not change the overall NO-GO status.

### Invitation, role, expiry, and capacity verification

The guarded production-fixture scripts ran against newly created, marker-owned data and did not send emails. Both scripts reported successful fixture cleanup; a subsequent read-only database query confirmed zero remaining marked workspaces and zero marked Auth users for the seat, invite, and AI quota test markers.

| Test | Result |
|---|---|
| Six-role SQL invite authorization (`owner`, `admin`, `sales_manager`, `sales_rep`, `member`, `viewer`) | PASS — owner/admin/sales_manager allowed; sales_rep/member/viewer denied |
| Valid invite acceptance and persisted membership | PASS |
| Expired invitation acceptance | PASS — rejected with SQLSTATE `22023` |
| Full Free workspace invite creation | PASS — rejected with SQLSTATE `23514` |
| Expired pending invitations and Pro seat capacity | PASS — with one member and three expired pending invites, exactly four additional active invites were accepted; the next invite was rejected, leaving 5/5 active seats |
| Cross-workspace invite creation and acceptance | PASS — denied; foreign workspace counts unchanged |
| Concurrent invite creation | PASS — 8 independent PostgreSQL connections / distinct backend PIDs; 4 accepted and 4 rejected, final Pro workspace 5/5 |
| Concurrent invite acceptance | PASS — 4 independent PostgreSQL connections / distinct backend PIDs; all four accepted, final Pro workspace 5/5 |
| Concurrent AI quota reservation | PASS — 8 independent PostgreSQL connections / distinct backend PIDs; 2 accepted at the 500-request boundary, 6 denied, final count 500/500 |
| Quota idempotency | PASS — repeated request key incremented the counter exactly once |
| Concurrent Free active-lead capacity | PASS — 8 independent PostgreSQL connections / distinct backend PIDs; 1 created, 7 rejected, final count 50/50 |

The concurrency test began at `2026-10-14T20:37:20.897Z`. The invitation functional test began at `2026-10-14T20:48:24.007Z`. These were direct production-database fixture tests under the explicit fixture authorization already recorded in this session; they are not representative customer-data tests.

### Read-only live schema and migration check

At approximately `2026-10-14T22:36Z`, the configured Supabase project reference was checked against the linked pooler reference and the database was queried read-only:

- Latest migration ledger entry: `20260921`.
- `20261014170000` remains absent from the migration ledger.
- Both live seat RPCs exist as `SECURITY DEFINER` functions with `search_path=pg_catalog, pg_temp`.
- Live invitation creation and acceptance functions both exclude pending invitations whose `expires_at` is in the past when calculating occupied seats.
- The live function bodies differ from the checked-in migration (including `search_path` and additional validation/role rules). This source/ledger drift is still unresolved. No migration was run or edited in the live database.

### AI token/cost accounting corrections

Code changes in this follow-up:

- `src/lib/aiCost.ts` now rejects unsupported model pricing instead of silently charging the `gpt-4.1-mini` price for another model.
- AI usage writes now validate token counts and throw on audit-log insert errors. AI usage summary reads now throw on database errors or malformed stored counts/costs rather than returning an empty/zero summary.
- `/api/usage` now returns an explicit `503` if workspace usage, the AI usage summary, or active lead counts cannot be verified.
- The `ai/chat`, `sales-copilot`, and `revenue-forecast-ai` paths no longer substitute zero tokens when provider usage metadata is missing. The revenue forecast route returns `503` if a successful provider response cannot be recorded, rather than quietly presenting an untracked response as success.
- Added `tests/ai-cost.test.mjs` and `npm run test:ai-cost` for configured-price calculation, unknown-model rejection, invalid token rejection, insert/read database failures, summary aggregation, and invalid month rejection.

**Coverage still incomplete:** the source inventory shows AI providers using `gpt-4.1-mini`, `gpt-4o-mini`, and `gpt-5.5-mini`, while `src/lib/aiCost.ts` has an authorized price entry only for `gpt-4.1-mini`. Several AI routes also do not currently call `recordAiUsageEvent`. They are deliberately not assigned guessed prices here. Complete per-route token/cost attribution requires authoritative prices for every configured model and wiring/tests for every actual provider route. No AI provider request was made in this follow-up.

### Re-run local gates

| Command / check | Result |
|---|---|
| `npm run test:ai-cost` | PASS — 7/7 |
| `npm run test:usage-quota` | PASS — 6/6 |
| `npm run test:workspace-auth` | PASS — 2/2 |
| `npm run lint:tenancy` | PASS |
| `npm run lint` | PASS — 0 errors, 123 warnings |
| `npm run build` | PASS — TypeScript completed and 98 static pages generated |
| `npm run verify:release` | PASS — tenancy guard and production build |
| `npx eslint` on the focused changed source/test files | PASS — 0 errors; one existing `no-explicit-any` warning in `sales-copilot` |
| `git diff --check` | PASS — Git emitted only LF/CRLF conversion notices |
| Read-only fixture cleanup query | PASS — zero marked workspaces/users remain for the seat, invite, and AI quota fixture markers |

### Remaining release blockers and recommendation

- Migration history and live function-definition drift remains unresolved. The ledger must be reconciled through an authorized, reviewed migration process; this follow-up intentionally did not alter production schema or migration history.
- AI usage accounting is now fail-closed for recorded events and usage summaries, but not all AI routes record tokens, and two configured model prices remain unverified. Provider outage/timeout behavior and successful paid provider accounting were not exercised with a mock provider.
- Stripe lifecycle, auth recovery/email delivery, full malformed import/export cases, complete resource-by-resource Cross-Tenant coverage, monitoring, backup/restore, production deployment, and mobile/browser workflows remain unverified.

**Recommendation remains NO-GO.** Role, invite-expiry, workspace-isolation, and true parallel seat/quota/lead-capacity checks passed with isolated marked fixtures. Local build and release gates pass. The unresolved migration drift and incomplete end-to-end AI accounting, billing, and operational checks still prevent release approval. No migration or deployment was performed.

## Migration Drift Follow-up (2026-10-14T23:16+02:00)

### Reviewed migration plan and source corrections

The preflight showed that the remote ledger ended at `20260921`, while the official Supabase CLI dry run listed exactly seven pending migrations, in order:

1. `20260930_usage_exports_count.sql`
2. `20261001_workspace_file_storage.sql`
3. `20261006_lead_task_restore_and_calendar_trash.sql`
4. `20261006120000_lead_task_meeting_cascade.sql`
5. `20261008120000_customers_contact_required_company_optional.sql`
6. `20261008130000_leads_company_optional.sql`
7. `20261014170000_atomic_workspace_limits.sql`

The live catalog showed these older schema objects were already present, but six of the lead-restore/file helper functions had explicit `anon` EXECUTE grants. Because the pending migrations use `CREATE OR REPLACE FUNCTION`, their original `REVOKE ... FROM public` statements would not remove those direct grants. Before application, the migrations were corrected to revoke from both `public` and `anon` in:

- `supabase/migrations/20261001_workspace_file_storage.sql`
- `supabase/migrations/20261006_lead_task_restore_and_calendar_trash.sql`
- `supabase/migrations/20261006120000_lead_task_meeting_cascade.sql`

The post-migration verifier now checks authenticated-only execution for these file-helper and lead/task restore RPCs as well as the atomic-limit RPCs. The customer backfill migration was also reviewed: the preflight found one existing customer row needing normalization and zero eligible leads missing a customer. The user explicitly authorized that one-row normalization; no customer rows needed inserting or deleting.

### Application and live verification

The user authorized the seven reviewed migrations and the one-row normalization. The official Supabase CLI `2.121.0` applied them to the linked production database on `2026-10-14`; command:

`supabase db push --linked --yes --skip-vault`

The runner applied the seven listed migrations in order. `--skip-vault` prevented unrelated Vault updates. No application deployment was performed. A subsequent read-only transaction verified the ledger, functions, grants, constraints, policies, trigger, and data state:

| Check | Result |
|---|---|
| Remote migration ledger | Latest `20261014170000`; all seven reviewed versions recorded |
| Atomic-limit, invite, role and search-path checks | **18 PASS, 0 FAIL, 0 INFO** |
| Lead/task/file helper grants | Authenticated execution retained; direct `anon` and `PUBLIC` execution denied |
| Usage events | RLS, member policy, allowed-bucket check, workspace cascade FK and request idempotency unique constraint all verified |
| Capacity and billing helpers | Lead-capacity trigger present; workspace plan helper not client-executable |
| Customer normalization | 0 rows remain needing normalization; 0 eligible leads lack a customer |
| Data changes | One authorized existing customer row normalized; no customer inserts or deletes reported by the reviewed migration |

`supabase migration list --linked` then showed local and remote versions matching through `20261014170000`. The migration-ledger/schema discrepancy is therefore **closed and verified in production**. This is a database migration, not a full application release.

The ACL corrections were added to the migration files before this production run. An environment that had already recorded any of those older migration versions will not rerun the edited file automatically; other environments' ledgers and grants were not checked. Verify those environments separately and use a new forward-only corrective migration there if the versions are already recorded.

### Release status

`npm run verify:release` passed after the migration-source changes; it ran the tenancy guard and production build. `git diff --check` also passed (Git emitted only existing line-ending normalization warnings). The full `npm run lint` was not rerun in this follow-up.

**Overall recommendation remains NO-GO.** This follow-up closes only the migration discrepancy. The other release blockers documented above—including incomplete end-to-end verification of authenticated AI provider success and full token/cost accounting, Stripe billing states, and operational/backup checks—remain. Do not interpret this migration verification or a successful build as a complete production-readiness sign-off.

## Smoke Run Recheck (2026-10-14T23:22:52+02:00 to 2026-10-14T23:32:24+02:00)

This is the latest execution record and supersedes earlier lint, migration, cross-tenant, and release-gate statuses in the historical snapshots above. The application was served locally on loopback from the production build. Supabase integration was enabled for explicitly authorized, synthetic, marker-scoped fixtures; the local server process had OpenAI, Resend, and Stripe credentials disabled. No paid provider call, email, payment, checkout, or application deployment was made.

### Results from this run

| Area | Actual result | Environment / evidence |
|---|---|---|
| Full lint | **PASS** — 0 errors, 123 warnings; no warning suppressions added | Local `npm run lint`; warnings remain as previously triaged and are not all proven harmless |
| Unit tests | **PASS** — `test:ai-cost` 7/7, `test:usage-quota` 6/6, `test:workspace-auth` 2/2 | Local Node test runner |
| Tenancy guard and build | **PASS** — `npm run verify:release`; tenancy guard, Next.js 16.4.1 optimized build, TypeScript, 98 static pages | Local build; no application deploy |
| Production dependencies | **PASS** — `npm audit --omit=dev`: 0 vulnerabilities | Local package lock / npm advisory database at run time; development dependency findings are outside this command |
| Patch formatting | **PASS** — `git diff --check`; only Git LF/CRLF notices | Local worktree |
| Key page routes | **PASS as HTTP route smoke only** — `/`, `/login`, `/pricing`, `/dashboard`, `/leads`, `/pipeline`, `/tasks`, `/calendar`, `/customers`, `/analytics`, `/forecast`, `/ai`, `/team`, `/billing` returned HTTP 200 | Local loopback production server; 200 on protected page URLs does not prove authenticated page data/rendering |
| Health endpoint | **PASS at application level** — `GET /api/health` returned HTTP 200 | Local loopback only; the endpoint does not establish database/provider/monitoring health |
| AI authentication | **PASS** — all 16 known AI POST routes returned 401 without credentials | Local loopback production build; requests used empty JSON and made no provider calls |
| AI quota enforcement | **PASS** — all 16 AI routes returned 429 for an authenticated synthetic Free-workspace user at its exhausted 10-request allowance; persisted usage remained 10 and no usage event was added | Local loopback application backed by the linked production Supabase project; fixture workspace/user were removed and cleanup was verified |
| Invite role and seat behavior | **PASS** — six-role policy, valid acceptance/persisted membership, expired acceptance denial, full Free workspace denial, expired invitations excluded from seats, and cross-workspace create/accept denied | `npm run test:workspace-invite:production`; linked production Supabase with synthetic fixtures; script reported all marked users/workspaces cleaned |
| Real PostgreSQL concurrency | **PASS** — 8 separate connections/PIDs: Pro invites 4 accepted/4 denied at 5/5; AI quota 2 accepted/6 denied at 500/500; Free lead capacity 1 accepted/7 denied at 50/50; request-key retry counted once. Four separate connections accepted invitations to the final 5/5 seat boundary | `npm run test:workspace-seat-concurrency:production`; linked production Supabase, marked fixtures; script reported cleanup |
| Cross-tenant API negative suite | **PASS, 7/7** — search, lead score, next action, calendar update/delete, leads export, customers export | `npm run test:cross-tenant:suite`; local loopback app plus synthetic production-Supabase fixtures; wrapper reported marker-scoped cleanup |
| Migration/schema | **PASS** — 18 PASS, 0 FAIL, 0 INFO; all seven reviewed migrations recorded through `20261014170000` | Read-only production verification from the preceding migration follow-up; not rerun as a mutating operation in this smoke pass |

The production-backed tests changed only their marked temporary fixtures, which their harnesses reported deleted. They did **not** exercise or mutate customer-owned CRM records. The previously authorized customer normalization performed by the migration remains separately documented above.

### Still open — do not report as passing

- **AI success, provider failure, timeout, and full cost accounting:** no provider calls were made. Unit tests verify configured model cost handling and fail-closed audit writes, but route-level successful token/cost persistence and provider outage behavior are not end-to-end verified. The codebase's AI model price mapping and `recordAiUsageEvent` coverage were previously found incomplete; authoritative missing prices must be obtained before assigning them.
- **Workspace isolation breadth:** the seven negative probes passed, but they are not exhaustive for every resource, CRUD/bulk/restore path, administrative operation, import, task, usage record, file object, or direct RPC. No blanket RLS-policy test across every tenant table was run.
- **Billing:** no Stripe price retrieval, test-mode checkout, portal, webhook replay/order, failed payment, cancellation, upgrade/downgrade, or subscription-entitlement test was run. No Stripe operation was issued. Displayed plan prices are not evidence of configured Stripe Price objects.
- **Auth and messaging:** signup/confirmation, password reset, expired/revoked sessions, refresh/logout, deep-link behavior, real invitation delivery, and MFA recovery were not all re-exercised in this pass. No live email was sent.
- **CRM and data lifecycle:** duplicate/invalid CSV imports, partial failures, lead/customer CRUD and restore, exactly-once pipeline activities, task/calendar DST behavior, and retry semantics were not covered end-to-end by this pass.
- **Operations:** health was checked only on a local app server. Production observability, error alert delivery, deployment/rollback, backup retention, and restore from backup were not exercised. Browser/mobile accessibility, layout, and full authenticated navigation also remain without current evidence.
- **Other environments:** production migration verification does not prove that staging or other Supabase projects have matching ledgers, function grants, or schema.
- **Lint warnings:** 123 remain. `npm run lint` is successful, but warnings include effect/state, dependency, render-purity, explicit-any, unused-variable, and accessibility findings; code-by-code remediation was not part of this smoke execution.

### Final release decision

The release smoke run now has current passing evidence for lint (with warnings), build/type-check, local route availability, AI unauthenticated denial, AI exhausted-quota denial on every inventoried AI route, invitation roles/limits, true database parallelism for seats/quota/leads, seven cross-tenant negatives, production migration ledger/schema, and production dependency audit.

**Recommendation: NO-GO for production release.** Critical portions of the requested full proof remain unverified, especially authenticated AI provider success/failure and complete usage/cost attribution, Stripe billing lifecycle, exhaustive tenant/resource isolation, full auth and import/CRM workflows, and production recovery/monitoring. A complete execution record is not equivalent to every smoke category passing; no untested area is marked as passed.

## AI Usage Logging Recheck (2026-10-14T23:52:09+02:00)

This local recheck follows the AI usage instrumentation changes. It supersedes only the AI-cost unit-test and local release-gate results above; it does not replace or extend the production-backed fixture results.

| Area | Actual result | Environment / evidence |
|---|---|---|
| AI usage audit persistence | **CODE CHANGED** — usage events now use the server-side admin client for the audit insert, after the route has already authorized the actor and workspace. This addresses the manager-only `audit_logs` insert policy blocking ordinary workspace members. No RLS policy was broadened and no migration was added. | Local code change only; no Supabase insert was performed in this recheck |
| AI model price mapping | **CODE CHANGED** — added dated aliases for the configured `gpt-4.1-mini` and `gpt-4o-mini` models at the same documented rates as their base model IDs. | Local code; unit coverage verifies the configured model-rate calculation, not a live provider response |
| Tracked OpenAI retries | **CODE CHANGED** — SDK retries are disabled for tracked clients so a successful provider response followed by an audit-persistence error is not automatically reissued by the SDK. | Local code; no provider request was made |
| AI cost tests | **PASS** — 12/12, including successful response token extraction, base and dated model prices, and fail-closed behavior on missing usage and audit-write errors. | `npm run test:ai-cost`; local mocked provider/database clients |
| Related quota/auth tests | **PASS** — usage quota 6/6; workspace auth 2/2. | `npm run test:usage-quota`; `npm run test:workspace-auth`; local |
| Full lint | **PASS** — 0 errors, 123 warnings. | `npm run lint`; local |
| Targeted lint | **PASS** — 0 errors, 1 existing `no-explicit-any` warning in `sales-copilot/route.ts`. | ESLint on the usage logger, three manually tracked routes, and AI cost tests |
| Build | **PASS** — optimized build and TypeScript checks completed; 98 static pages generated. | `npm run build`; local |
| Release verification | **PASS** — tenancy guard and production build completed. | `npm run verify:release`; local |
| Diff formatting | **PASS** — `git diff --check` found no whitespace errors; Git emitted only existing LF/CRLF notices. | Local worktree |
| Authenticated provider-to-database flow | **NOT RUN** — no real or test OpenAI request and no Supabase audit write were made. | Requires an explicitly isolated provider/database test setup; not verified by mocked unit tests |

No migration, production-data write, payment, email, or deployment was performed in this recheck. The service-role audit path relies on the caller having completed workspace authorization before invoking the tracker; this remains subject to authenticated route-level verification. Idempotent accounting across an ambiguous database insert outcome is also not established by this unit suite.

**Recommendation remains NO-GO.** The manager-role RLS incompatibility has a code-level correction and local unit/build evidence, but authenticated AI route success/failure, production or isolated-database audit persistence, billing lifecycle, exhaustive tenant isolation, and recovery/operations are still open.

## Authorized Authenticated AI Route Test (2026-10-14T22:04:21Z)

One production-backed success test was run after explicit authorization for exactly one synthetic provider request and for retaining its marked test account/workspace and usage record. The app itself ran from the local production build on loopback; the request used the configured remote Supabase project and OpenAI provider. The fixture has no real customer data. No Stripe request, email, migration, deploy, or second AI request was made.

| Area | Actual result | Environment / evidence |
|---|---|---|
| Authenticated AI route | **PASS** — `POST /api/ai/email-generator` returned HTTP 200 with non-empty subject and body. | Local production build at `127.0.0.1:3100`; synthetic confirmed Auth fixture and Free workspace in the configured production Supabase project |
| Provider and token accounting | **PASS for this one call** — provider returned model `gpt-4.1-mini-2025-04-14`, 123 prompt tokens, 105 completion tokens; cost persisted as $0.000217 USD and matched the configured model rates. | Real OpenAI response through the application route; matching `audit_logs` row read back from Supabase |
| Quota accounting | **PASS for this one call** — the fresh workspace began at 0; persisted AI count ended at 1 and exactly one `usage_events` row existed. | Production Supabase read-after-write assertions in `tests/ai-route-success-production.mjs` |
| Fixture retained by authorization | **PASS** — synthetic user, Free workspace, one quota event, and one AI usage/cost audit event remain. | Account `closeflow-ai-smoke-1592df21-b4f0-41c7-9f6c-c197e10df45a@example.invalid`; workspace `7c928df8-ad73-45e3-9839-9b70aa9bf037`; user `92f65752-0821-42d4-864b-2e059ecb8913` |
| Repeatable test guard | **PASS** — the production test requires explicit fixture-write and AI-call environment gates and accepts only a loopback application URL. | `npm run test:ai-route-success:production`; no authorization flags are committed |
| Local AI cost tests | **PASS** — 12/12 after the live call. | `npm run test:ai-cost`; local mocked unit tests |
| Local server cleanup | **PASS** — test server stopped by its identified process ID; port 3100 no longer listens. | Local machine |

This proves the authenticated success path, actual provider token response, admin audit insert despite manager-only client RLS, and quota/audit read-after-write for **one AI feature and one synthetic production workspace**. It does not prove failure/timeout behavior against the live provider, other AI feature paths, or general production health. No failure-injection request was made.

**Release recommendation remains NO-GO.** Stripe lifecycle, broader authenticated AI route coverage, provider failure behavior, exhaustive workspace/resource isolation, other auth/CRM flows, and backup/recovery/operations remain unverified.

## Additional AI Failure and Stripe Webhook Checks (2026-10-15T00:16:06+02:00)

This follow-up used the local production build on loopback and only marked synthetic Stripe webhook fixtures in the configured Supabase project. Stripe was confirmed to use a test-mode secret by its `sk_test_` prefix. The webhook test constructed signatures locally with the configured webhook secret; it did not call the Stripe API or create checkout/payment objects.

| Area | Actual result | Environment / evidence |
|---|---|---|
| AI accounting unit suite | **PASS — 15/15** — includes exact token/cost recording, unknown models, malformed usage, database-write failures, provider HTTP errors, transport errors, and non-completion requests. | `npm run test:ai-cost`; local mocks, no provider request |
| Usage quota unit suite | **PASS — 6/6** | `npm run test:usage-quota`; local mocks |
| Workspace auth unit suite | **PASS — 2/2** | `npm run test:workspace-auth`; local mocks |
| Signed Stripe webhook lifecycle | **PASS** — invalid signature was rejected with no DB mutation; checkout completion created the subscription row; exact replay remained one row; synthetic updates persisted Pro/Business, `past_due`, scheduled cancellation, and deleted/canceled states. | `npm run test:stripe-webhook:production`; local build + test-mode webhook signing + marked synthetic Supabase workspace |
| Stripe API/payment | **NOT RUN** — no Stripe API request, Checkout Session, portal session, payment, customer, email, or live webhook was created. | This check tests only the application's signed webhook handler |
| Stripe fixture cleanup | **PASS** — the marked workspace/subscription and synthetic Auth user were deleted and absence verified. | Harness read-after-delete verification |
| Earlier Stripe run | **Initial harness attempt reported cleanup verification failure after the Auth deletion API returned expected 404 for the deleted user.** The test was corrected to treat only Auth `user_not_found`/404 as successful absence, then rerun successfully; independent read-only checks confirmed the first attempt's user/workspace were absent. | No retained Stripe fixture from either attempt |
| Retained AI fixture integrity | **PASS** — read-only verification found the expressly retained synthetic AI workspace/account and exactly one current-month AI quota count, one quota event, and one usage/cost audit event. | Direct read-only Supabase checks after the single authorized OpenAI call |
| Full lint | **PASS** — 0 errors, 123 warnings. | `npm run lint`; local |
| Release verification | **PASS** — tenancy guard and optimized Next.js build/TypeScript completed; 98 static pages generated. | `npm run verify:release`; local |
| Patch formatting | **PASS** — `git diff --check`; only Git LF/CRLF notices. | Local worktree |

The synthetic webhook fixture was created, updated, and removed; no customer workspace was targeted. The first harness attempt's cleanup false-negative did not leave a Stripe fixture, as confirmed by separate read-only lookups and the successful rerun.

**Release recommendation remains NO-GO.** These checks do not exercise a Stripe API checkout/portal/payment lifecycle, event delivery from Stripe, out-of-order subscription events, or webhook behavior across all subscription transitions. AI live success is still proven for only the single authorized email-generator call; live provider failures, other provider-backed routes, and ordinary non-manager membership remain without live route evidence. Exhaustive tenant isolation, full auth/CRM/import flows, operations, backups, and recovery remain open.

## Final Local Auth Route Recheck (2026-10-15T00:17:46+02:00)

| Area | Actual result | Environment / evidence |
|---|---|---|
| AI/Billing route authentication | **PASS — 19/19** unauthenticated POSTs returned 401: all 16 inventoried AI routes and the three Stripe checkout/portal/plan routes. | Local production build on loopback; empty JSON; no authenticated fixture and no DB/provider/billing writes |
| Stripe webhook signature presence | **PASS** — webhook request without a `stripe-signature` returned 400. | Local production build on loopback; no DB writes |
| Health route | **PASS** — `/api/health` returned 200. | Local production build on loopback; application-level response only |
| Test server cleanup | **PASS** — process stopped by PID and port 3102 verified closed. | Local machine |

This is an unauthenticated route guard check only; it does not prove authenticated route authorization, response content, downstream service health, or release readiness.

**Overall recommendation remains NO-GO.** The newly passing local and synthetic test cases do not close the remaining release gaps listed above. Release is not eligible for GO while billing lifecycle/API, full authenticated AI coverage, CRM/auth/import regression, broad tenant isolation, and recovery/operations checks remain unverified.

## Post-Migration Final Verification (2026-10-15T00:28:45+02:00)

The outstanding lead-capacity-trigger ACL migration was applied through the Supabase CLI after the CLI dry-run identified it as the sole pending migration. Local and remote migration history now agree through `20261015002000`. The updated read-only database verification returned **20/20 PASS**, including the migration ledger entry, trigger-function execution privileges, RLS, and the previously checked RPC/security-definer properties.

After the migration, the marked production-fixture checks were repeated:

| Check | Result | Scope and limits |
|---|---|---|
| Workspace invitations and seats | **PASS** | Role/seat rules, expired invitations, full Free workspace, and cross-workspace rejection |
| AI quota denial | **PASS — 16/16** | All inventoried AI routes returned 429 at exhausted quota; usage counters/events remained unchanged |
| Cross-tenant negative suite | **PASS — 7/7** | Search, lead score, next action, calendar update/delete, lead export, and customer export |
| Parallel limit checks | **PASS** | Independent PostgreSQL connections exercised seat, AI usage, lead-capacity, invite-acceptance, and idempotent-retry cases; persisted counts matched the asserted limits |
| Local release gates | **PASS** | `npm run verify:release`; `npm run lint` (0 errors, 123 warnings); focused AI-cost (15/15), usage-quota (6/6), and workspace-auth (2/2) tests |
| Database verification and diff whitespace | **PASS** | Read-only schema/ACL verification 20/20; `git diff --check` exited successfully |
| Test server cleanup | **PASS** | Local test server stopped by its listener PID; port 3104 verified closed |

Fixture suites reported cleanup of their marked users/workspaces. The separately authorized single successful AI-provider fixture is intentionally retained: its synthetic user/workspace and one AI quota event and one usage/cost audit record remain in the configured production database.

These results close the recorded migration discrepancy and establish the explicitly listed fixture and local checks only. They do not establish full production readiness. Real Stripe Checkout/Portal/payment lifecycle and delivery remain untested; successful provider-backed AI execution remains evidenced by only one route/call, and live provider failure behavior is unverified. Full authentication/recovery, CRM/import, exhaustive resource-by-resource tenant isolation, and production monitoring/backup/restore/deployment checks remain open.

**Final recommendation remains NO-GO for production release.** Do not promote based on this partial smoke evidence.

## Authenticated Lead, Calendar, Task, and CSV Lifecycle Verification (2026-10-15T01:01:57+02:00)

A new loopback-only integration harness created a marked synthetic Auth user and Free workspace in the configured Supabase project, authenticated through Supabase, exercised the application API routes against a local production build, and verified cleanup of its marked workspace and Auth user.

| Area | Actual result | Evidence and limits |
|---|---|---|
| CSV lead import | **PASS** — one valid row inserted; missing-name and invalid-number rows were reported/skipped. Replaying the same CSV inserted none and reported the matching row unchanged. | Authenticated `POST /api/leads/import`; database-backed fixture |
| CSV lead export | **PASS** — exported both marked active leads as CSV; workspace export usage increased exactly once. | Authenticated `GET /api/leads/export?format=csv`; counter read back from Supabase |
| Customer CSV import | **PASS** — one new customer was imported; duplicate and invalid-revenue rows were skipped with issues. Replaying the file inserted no duplicate records. | Authenticated `POST /api/customers/import`; lead/customer database records checked |
| Customer CSV export | **PASS** — exported won/imported customer companies and their expected revenue; cumulative workspace export usage was exactly 2 across one lead and one customer export. | Authenticated `GET /api/customers/export?format=csv`; counter read back from Supabase |
| Lead create and list | **PASS** — created and listed a lead attributed to the fixture workspace and user. | Authenticated `POST` and `GET /api/leads` |
| Pipeline and automation | **PASS** — `new → contacted` created exactly one status activity and one follow-up task; repeating the same status did not duplicate either. `contacted → won` generated the second status activity without a second follow-up task. | Authenticated `PUT /api/leads`; activities/tasks queried from Supabase |
| Won-customer synchronization | **PASS** — exactly one active customer was synchronized with the expected revenue. | Database read-after-write assertion on `customers` |
| Calendar event lifecycle | **PASS** — created and updated an event, soft-deleted and restored it, then verified lead deletion/restoration also soft-deleted/restored the linked event and toggled `deleted_with_lead` correctly. | Authenticated calendar API routes plus Supabase state assertions |
| Task lifecycle | **PASS** — edited priority/due date, completed and reopened the automation-created task; lead deletion/restoration soft-deleted/restored that dependent task. | Authenticated Supabase client operations using the marked user's bearer session |
| Soft delete and restore | **PASS** — deletion retained the lead in trash and soft-deleted its dependent task; restoration recovered the lead and task and created one restore activity. | Authenticated `DELETE`/`PATCH /api/leads`; Supabase read-after-write checks |
| Fixture cleanup | **PASS** — marked workspace deletion and marked Auth-user deletion were verified. | Harness cleanup executed in `finally`; local server stopped and port 3104 verified closed |

The harness requires `CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES`, a configured remote Supabase URL, and a local loopback `BASE_URL`; it makes no payment or AI-provider request. These tests establish only the above lead/customer/calendar/task data paths, not all CRM operations, all filters/search/pagination, UI-specific interactions, concurrency/idempotency under ambiguous network retries, or every calendar workflow.

**Overall recommendation remains NO-GO.** Stripe API checkout/portal/payment, broader authenticated AI success/failure, complete authentication/recovery, remaining CRM and workspace workflows, exhaustive tenant isolation, and production monitoring/backup/restore/deployment still require evidence.

## Authenticated Stripe Test-Mode API Lifecycle (2026-10-15T00:49:22+02:00)

A separate loopback-only harness used a synthetic workspace owner and enrolled/verified a temporary TOTP factor to obtain an AAL2 session. It was explicitly gated by both fixture-write and Stripe-test-mode flags, rejected non-`sk_test_` credentials, used a seven-day trial, and verified cleanup of the marked Checkout session, subscription, customer, workspace, and Auth user.

| Area | Actual result | Evidence and limits |
|---|---|---|
| Checkout API | **PASS** — application route created a real Stripe test-mode Pro subscription Checkout Session with expected workspace and plan metadata and configured Pro price. | Authenticated AAL2 owner; session retrieved from Stripe and expired during cleanup |
| Billing Portal API | **PASS** — application route returned a Stripe Billing Portal session for the marked test customer. | Authenticated AAL2 owner; test-mode customer with no payment |
| Plan upgrade | **PASS** — application route changed a seven-day trial subscription from Pro to Business; retrieved Stripe subscription used the Business price. | Stripe test-mode API; no payment method or invoice payment |
| Downgrade/cancellation | **PASS** — application route scheduled Free cancellation at period end; Stripe reported `cancel_at_period_end=true`. | Marked trial subscription immediately canceled during cleanup |
| Fixture cleanup | **PASS** — Checkout session expired; subscription canceled; customer deleted; workspace and Auth user removed and verified. | Test harness `finally` cleanup; local server stopped and port 3104 verified closed |

This proves the configured test-mode Stripe API and authenticated application routes for session creation, portal creation, upgrade, and scheduled cancellation. It does **not** prove a customer completing Checkout, payment authorization/capture/refund, live Stripe webhook delivery or retry/out-of-order behavior, actual paid subscription invoice transitions, or live-mode configuration. No live key, real payment method, charge, or email was used.

**Overall recommendation remains NO-GO.** Those Stripe lifecycle limits and the remaining AI, broader CRM/auth/workspace, tenant-isolation, monitoring and recovery checks are still release gaps.

## Authentication Callback Hardening (2026-10-15T00:53:32+02:00)

Source inspection found that the callback accepted a `code` parameter but never exchanged it for a Supabase session. It now calls `exchangeCodeForSession(code)` before reading the user or redirecting, and sends exchange failures to the login error path. The `next` destination is also checked against the callback origin after URL parsing, preventing slash/backslash URL parsing from turning a same-looking path into an external redirect.

| Check | Result | Scope |
|---|---|---|
| TypeScript/Next production build and tenancy guard | **PASS** | `npm run verify:release` after the callback change |
| Full lint | **PASS** | `npm run lint`: 0 errors, 123 warnings |
| Invalid callback code | **PASS** | Local production build returned a login error redirect instead of proceeding |
| External callback destinations | **PASS** | Local production build rejected both `//evil.example` and `/\\evil.example` `next` values and omitted them from the login redirect |
| Authenticated AAL2 | **PASS** | The Stripe test-mode API suite signed in a marked owner, enrolled and verified TOTP, and used the resulting AAL2 bearer session against the billing routes |

The invalid-code and redirect probes do not prove a successful OAuth callback, email-confirmation delivery, a real browser PKCE cookie round-trip, or full password-recovery UI/session behavior. Those remain open and must not be treated as passing.

**Overall recommendation remains NO-GO** pending those auth flows and the still-open AI, complete CRM/workspace, isolation, and production-operational checks.

## Synthetic Password Recovery Verification (2026-10-15T00:54:54+02:00)

A production-backed Auth fixture test used Supabase Admin `generateLink` to create a synthetic recovery token without sending an email. The test verified initial password sign-in, exchanged the recovery token for a recovery session, changed the password, signed in with the new password, rejected replay of the consumed token, and deleted the marked Auth user.

**Result: PASS for the Supabase recovery-token/session/password-update path only.** Email dispatch/delivery, browser link navigation, callback PKCE exchange on a successful code, and full UI/browser recovery remain unverified.

## Final Verification After Additional Smoke Coverage (2026-10-15T01:03:09+02:00)

| Gate | Result |
|---|---|
| `npm run verify:release` | **PASS** — tenancy guard and Next.js production build/TypeScript; 98 static pages generated |
| `npm run lint` | **PASS** — 0 errors, 123 warnings |
| Focused local unit tests | **PASS** — AI cost 15/15, usage quota 6/6, workspace auth 2/2 |
| Production-backed fixtures | **PASS** — lead/customer CSV and pipeline; calendar/task lifecycle; synthetic password recovery; Stripe test-mode Checkout/Portal/plan changes. All marked fixtures were cleaned up. |
| Read-only database ACL/RLS/migration verification | **PASS — 20/20** |
| New integration harness syntax checks | **PASS** — Auth recovery, CRM lifecycle, and Stripe test-mode scripts parse successfully |
| `git diff --check` | **PASS** |
| Local test-server cleanup | **PASS** — port 3104 closed |

**Release status is still NO-GO.** The passing gates above do not substitute for the explicitly unverified live-provider failures/broader AI success, complete OAuth/PKCE and email-delivery flow, full calendar/task/automation and workspace operations, exhaustive cross-tenant coverage, real paid Stripe/webhook delivery transitions, or production monitoring, deployment, backup, and restore evidence.

## Authenticated Production UI Smoke Run (2026-10-15T01:59:33+02:00)

The signed-in browser session exercised the deployed production UI in the user-confirmed dedicated test workspace. No code or deployment changes were made during this run.

| Area | Result | Evidence / limitation |
|---|---|---|
| Dashboard and navigation | **PASS for observed pages** | Dashboard, leads, customers, pipeline, team, tasks, calendar, activities, analytics, forecast, costs, files, automations, notifications, AI, trash, billing, admin, and settings loaded in observed browser runs without observed JavaScript exceptions. This is not a substitute for every interaction on every page. |
| Leads, pipeline, tasks, trash | **PASS for marked fixture lifecycle** | Created and edited a marked lead; moved it to Contacted; observed one follow-up task and one activity; repeat-save did not create a duplicate follow-up task. Edited, completed, reopened, soft-deleted, restored, and soft-deleted the task and lead. The marked lead and task were visible in trash afterward. |
| Calendar | **PASS for marked fixture lifecycle** | Created, edited, soft-deleted, restored, and soft-deleted a marked calendar event; it was visible in trash afterward. |
| Customer derivation and deletion | **PASS for marked fixture path** | A marked Won lead appeared as a customer with the expected company, deal, contact, and EUR 875 revenue. Deleting the customer removed its deal from active customer data; the customer was visible in the Customers trash section. |
| Files | **PASS for upload, authenticated download endpoint, and delete; browser download event unverified** | Uploaded and permanently deleted marked text fixtures. The authenticated download endpoint returned HTTP 200 with the expected attachment filename and exact fixture bytes. The integrated browser did not expose a native download event, so end-user browser save behavior remains unverified. |
| Automations | **PASS for create, deactivate, delete only** | Created, deactivated, and deleted a marked automation. No trigger execution was performed or verified. |
| Active-data cleanup | **PASS for visible dashboard check** | The dashboard showed 6 active leads and 6 open tasks, with none of the marked fixture identifiers visible. The marked soft-deleted lead, task, calendar event, and customer remain in trash; “Empty trash” was not used. Existing B31 trash entries were left untouched. |
| Workspace creation | **FAIL / product behavior discrepancy** | The Team UI exposed “Create workspace”, but the request returned HTTP 400, “Workspace already exists for user”, for the signed-in user. No additional workspace was created. Whether the intended product supports multiple workspaces per user is not established; do not change membership or creation policy without resolving that requirement. |

**Overall release status remains NO-GO.** This UI run adds evidence only for the marked browser paths above. File download and automation execution remain unverified; workspace creation has a UI/API behavior mismatch; successful OAuth/PKCE and email delivery, broad resource-by-resource tenant isolation, paid test-checkout completion and real webhook delivery, and production monitoring/backup/restore evidence remain open. The retained trash fixtures are marked test data; existing B31 records were not altered.

## File Download Endpoint Follow-up (2026-10-15T02:02:18+02:00)

A new uniquely marked text file was uploaded through the production UI. An authenticated browser request to the same `/api/files` download URL used by the Download button returned **HTTP 200**, `text/plain`, `Content-Disposition: attachment` with the expected filename, and the exact expected file content. The UI click did not produce an observable native browser download event in the integrated browser, so the endpoint is verified but the browser's final save behavior is not. The marked file was permanently deleted through the UI; a fresh file listing returned HTTP 200 with no remaining files, and the local temporary fixture was removed. No other files were present or changed.

This follow-up does not change the overall **NO-GO** release recommendation or close the separate automation, workspace-creation, authentication, tenant-isolation, billing, or operational evidence gaps.

## Business Workspace Capacity Implementation and Production Verification (2026-10-15T02:27:55+02:00)

The Business workspace-capacity discrepancy is resolved. The confirmed policy is up to five owned workspaces when the user owns an active Business workspace; Free and Pro allow one owned workspace. Every newly created workspace starts on Free and has its own subscription and billing. Invited workspaces do not count toward the user's owned-workspace cap.

| Check | Result | Evidence |
|---|---|---|
| Database migration | **PASS** | Applied `20261015020000_business_workspace_capacity.sql` with the Supabase CLI. The RPC serializes creation per owner, checks the active Business entitlement, creates the workspace and owner membership atomically, and restricts RPC execution to authenticated users. |
| Production DB verification | **PASS — 24/24** | `supabase/verify-atomic-workspace-limits.sql`; includes function security/search-path/grants, the workspace cap implementation, and migration history. |
| Exact Business cap | **PASS** | In a rolled-back transaction against the dedicated Business smoke owner, four additional Free workspaces were created and the sixth total owned workspace was rejected with `workspace_owner_capacity`. Rollback residue: 0. |
| Build and tenancy guard | **PASS** | `npm run verify:release`; tenancy check passed and Next.js production build/TypeScript completed. |
| Focused unit tests | **PASS — 6/6** | `npm run test:workspace-capacity` (4/4) and `npm run test:workspace-auth` (2/2). |
| Full lint | **PASS with existing warnings** | 0 errors, 123 warnings. |
| Production deploy | **PASS** | Commit `d0cb23ce6e323adae37295056f7f759e30b5eb8a` was pushed to `main`; the production Team page showed `Owned workspaces: 1/5`. Production `/api/health` returned HTTP 200. |
| Authenticated UI create and switch | **PASS** | Created a marked second workspace; it appeared as Free, the owner count became 2/5, and switching between it and the Business workspace displayed the correct plan and preserved the count. |
| Test-workspace cleanup | **PASS** | The marked second workspace had no leads, tasks, calendar events, activities, automations, revenue, files, invites, or subscription. It was deleted through the protected workspace-delete endpoint; the production API then listed only the original workspace and no marker. |

This resolves and supersedes the earlier **Workspace creation FAIL / product behavior discrepancy** in the authenticated UI run above. No marked workspace fixture remains.

**Overall release status remains NO-GO.** This implementation closes only the workspace-capacity gap. Automation trigger execution, native browser download completion, successful OAuth/PKCE and email delivery, exhaustive cross-tenant operations, real paid checkout/webhook delivery, and production monitoring/backup/restore evidence remain open; no live payment or email was performed.


## Automation Execution Code Audit (2026-10-15)

| Area | Result | Evidence |
|---|---|---|
| Built-in status automations (`runLeadAutomation`: contacted -> follow-up task in 3 days, proposal -> follow-up task in 5 days, new -> reset next action) | Implemented; invoked from `src/hooks/useLeadActions.ts`, `src/app/api/leads/route.ts`, `src/app/api/demo/seed/route.ts`. Duplicate open tasks are prevented by title check. | Code review only; no new production run in this section. |
| User-defined workflows (`automations` table, `/api/automations`, Automations page) | **GAP / FAIL (not executed)** | Code search shows `automations` is only created/listed/updated/deleted in `src/app/api/automations/route.ts`. No code reads `trigger_event` or `actions` to run them, and `automation_runs` is not referenced anywhere in `src`. Presets such as `lead.created`, `lead.stage.lost`, `lead.idle_7d` therefore have no runtime effect. |

Required action: either implement a server-side executor (with idempotent run records) or relabel the page so it does not imply execution. Until then, UI wording must not promise that custom workflows run. The earlier smoke PASS for automations covers create/disable/delete only, not execution.

**Overall release status remains NO-GO.**


## Custom Workflow Executor Implementation (2026-10-15)

| Item | Result | Evidence |
|---|---|---|
| Executor | Implemented in `src/lib/workflowAutomations.ts`; called from `/api/leads` POST (`lead.created`) and PUT status change (`lead.stage.<status>`). Actions executed: `task.create`, `notify.user` (recorded as lead activity). `lead.status.update` is deliberately not executed (loop risk) and marks the run `partial`. | Code review, `tsc` clean, `verify:release` PASS. |
| Idempotency | Migration `20261015170000_automation_run_idempotency.sql` (applied to production) adds `automation_runs.dedupe_key` with unique index and member insert/update policies scoped to the workspace. | `tests/automation-run-idempotency.mjs` (rolled back): member insert PASS, duplicate rejected 23505 PASS, status update PASS, cross-workspace insert blocked PASS. |
| Not implemented / open | `lead.idle_7d`, `lead.idle_14d`, `task.overdue` need a scheduler and are NOT executed. No end-to-end UI run of a workflow in the production workspace yet. | Open. |

**Overall release status remains NO-GO.**


## Custom Workflow Production Verification (2026-10-15T16:58+02:00)

Executed in the Business test workspace "CloseFlow Workspace" with marked fixtures, via the authenticated production session.

| Check | Result | Evidence |
|---|---|---|
| `lead.created` workflow (preset "New lead follow-up") | **PASS** | New lead `CLOSEFLOW-UI-WF-20261015-1650` created the task "Call customer within 24h"; `automation_runs` row status `success`. |
| `lead.stage.proposal` workflow with `task.create` + `notify.user` | **PASS** | Status change created exactly one task `CLOSEFLOW-WF follow up in 3 days` and one activity `CLOSEFLOW-WF notice`; run `success`. |
| Idempotency | **PASS** | A repeated PUT with the same status created no further tasks, activities or runs. |
| Built-in `runLeadAutomation` | **PASS** | Created "Follow up proposal: <lead>" on the same transition. |
| Cleanup | Both test automations deleted (runs cascade). Lead soft-deleted to trash (HTTP 200). The three generated tasks remain as open fixtures tied to the trashed lead; they are marked and were not hard-deleted. |

Still open: idle (`lead.idle_7d/14d`) and `task.overdue` triggers have no scheduler and do not execute. **Overall release status remains NO-GO.**


## Scheduled Workflow Triggers (2026-10-15T17:35+02:00)

| Item | Result | Evidence |
|---|---|---|
| Implementation | `GET /api/cron/automations` (`src/app/api/cron/automations/route.ts`) executes `lead.idle_7d`, `lead.idle_14d` and `task.overdue` workflows (tasks need a linked lead); `vercel.json` schedules it daily at 06:00 UTC. Idempotency keys: idle = lead + last_activity_at; overdue = task + due_date. Service role is used only with queries scoped to the matching automation's `workspace_id`. | `tsc` clean, `verify:release` PASS. |
| Authorization | Bearer `CRON_SECRET` (constant-time compare); fails closed if the secret is unset. | Production: no header -> 401, wrong header -> 401. |
| Authorized execution | **NOT VERIFIED** | `CRON_SECRET` is not yet configured in Vercel (cannot be set from this environment), so the authorized path has not been exercised in production. |

Open: set `CRON_SECRET` in Vercel (Production), redeploy, then run an idle/overdue fixture test. **Overall release status remains NO-GO.**


## Scheduled Workflow Triggers: Production Verification (2026-10-15T18:15+02:00)

After `CRON_SECRET` was set in Vercel and redeployed:

| Check | Result | Evidence |
|---|---|---|
| Authorized cron call | **PASS** | HTTP 200 `{"ok":true,"errors":0}` (earlier 401 until the redeploy finished). |
| `lead.idle_7d` | **PASS** | Fixture lead with `last_activity_at` 10 days old produced exactly one task and one successful run. |
| `task.overdue` | **PASS** | Ran for the fixture task and 4 other existing overdue tasks that have leads (5 runs, `success`), each producing one marked activity. |
| Idempotency | **PASS** | A second immediate call returned `runs: 0`. |
| Cleanup | Marked automations, generated tasks/activities and the fixture lead were removed (hard delete of marked rows only). |

Note: enabling `task.overdue` acts on all existing overdue tasks with leads in the workspace on first run; this is intended but worth noting for users. The cron runs once daily. Remaining open items: native download confirmation, OAuth/PKCE and email delivery, full cross-tenant matrix, paid Stripe checkout/webhook, monitoring/backup/restore, `/api/health` dependency checks. **Overall release status remains NO-GO.**


## Health Endpoint Dependency Checks (2026-10-15T18:20+02:00)

`GET /api/health` now verifies a database round-trip (4 s timeout) and the presence of required configuration (Supabase URL/service role, Stripe webhook secret, OpenAI key, cron secret). It returns 200 `ok` or 503 `degraded` with only per-check pass/fail (no values or error details).

Production: HTTP 200, `database: ok`, `config: ok`. The 503 failure path was not exercised in production. This is a basis for an uptime monitor, but **no external monitor/alerting is configured**, so monitoring and backup/restore evidence stay open. **Overall release status remains NO-GO.**

Security note: during this session a command output displayed values from `.env.local` (OpenAI key, cron secret, Stripe webhook secret) in the assistant transcript. Rotating those three secrets is recommended.


## Database-Level Cross-Tenant RLS Matrix (2026-10-15T18:45+02:00)

`tests/rls-cross-tenant-matrix.mjs` (`npm run test:rls-matrix`) runs in a rolled-back production transaction with two disposable users/workspaces. As user A (member of workspace A only, role `authenticated`) it attempts read, update, delete and insert against workspace B for all 19 public tables that have `workspace_id`.

| Result | Detail |
|---|---|
| **FINDING (fixed)** | `lead_tags` and `lead_tag_links` had RLS disabled and no policies, so any authenticated user could read/modify them across workspaces. Both tables were empty and unused by application code. Migration `20261015190000_lead_tags_rls.sql` (applied to production) enables RLS with workspace-member policies; link inserts additionally require lead and tag to share the workspace. |
| After fix | **ALL PASS** for all 19 tables. |
| Coverage limits | Rows were seeded in workspace B for 13 tables, so read/update/delete leak checks are meaningful there. For `automation_runs, notifications, revenue_events, usage_events, workspace_invites, workspace_members` no seed row could be created generically; only insert-blocking is meaningful for those (reads are vacuous). Tables without a `workspace_id` column (e.g. `lead_tag_links`, `team_members`, `profiles`) are not covered by the matrix. HTTP-layer and RPC cross-tenant checks remain in the earlier suite. |

**Overall release status remains NO-GO.**


## Anon / Unrelated-User Leak Check Against Real Production Data (2026-10-15T18:55+02:00)

`tests/rls-leak-check.mjs` (`npm run test:rls-leak`, rolled back) creates one disposable user + workspace and, as `anon` and as that unrelated `authenticated` user, counts rows outside its own workspace in **all 36 public tables**, including those without `workspace_id` (`profiles`, `team_members`, `lead_tag_links`, `organization_*`, ...).

| Result | Detail |
|---|---|
| **PASS** | 0 foreign rows visible for both roles in every table. 17 of 36 tables contain real production rows, so those checks are meaningful; the other 19 are empty and the check is vacuous there. |
| Observation | All 36 tables have RLS enabled. `ai_generations, lead_memory, lead_scores, meetings, notes, team_members` have RLS but no policies (client access denied; service-role only). `anon`/`authenticated` hold table privileges everywhere, so RLS is the only barrier. |
| Legacy defect (not fixed) | `organizations`, `organization_members`, `organization_invites`, `organization_audit_events` fail with 42P17 (infinite policy recursion) for client roles. This fails closed (no data exposed). The only consumer, `src/hooks/useTeamWorkspace.ts`, is not imported anywhere, so the tables appear to be dead legacy. |

**Overall release status remains NO-GO.**


## Supabase Backup / Recovery Dashboard Check (2026-10-15T18:35+02:00)

Checked in the Supabase dashboard (project `itqzelpofshmzeajvmma`, Database > Backups, authenticated browser session):

| Item | Result | Evidence |
|---|---|---|
| Scheduled backups | **FAIL / BLOCKER** | The page states "Free Plan does not include project backups" and offers an upgrade to Pro for up to 7 days of scheduled backups. |
| Point-in-time recovery | **FAIL** (not available on this plan) | PITR tab is part of paid plans; not configured. |
| Restore test | **NOT PERFORMED** | There is nothing to restore from. |

Consequence: the production database holding customer CRM data currently has **no provider-managed backup or recovery path**. Required before any production release: upgrade to Pro (or implement and test an alternative export/restore routine), then perform and document a restore test. **Overall release status remains NO-GO.**


## Stripe Test-Mode Configuration Check via API (2026-10-15T18:50+02:00)

The Stripe dashboard tab was not logged in, so the check used the Stripe API with the test secret key (`sk_test_` prefix confirmed; no live key used, no payment made).

| Item | Result | Evidence |
|---|---|---|
| Webhook endpoint | **PASS** | One endpoint `https://closeflow-green.vercel.app/api/stripe/webhook`, status `enabled`, `livemode=false`, events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`. |
| Recent event delivery | **PARTIAL** | The 15 most recent test events (2026-10-14, a prior lifecycle test: subscription created/updated/deleted, invoices, checkout expired, customer deleted) all show `pending_webhooks=0`, i.e. no deliveries outstanding. The API does not show per-attempt HTTP results here, so successful processing is evidenced only by the earlier `stripe-webhook-production` fixture test, not by this check. |
| Test subscriptions | INFO | Two test-mode subscriptions exist: one canceled with workspace metadata, one `active` without `workspace_id` metadata (likely a leftover test object; unverified origin). |
| Paid checkout through the UI with a Stripe test card | **NOT PERFORMED** | Would require creating a subscription on a workspace; still open. |

**Overall release status remains NO-GO.**

## Stripe-Testkarten-Checkout (2026-10-15, Testmodus)
- Wegwerf-Workspace `CLOSEFLOW-UI-STRIPE-20261015`, Upgrade auf Pro mit Testkarte 4242: Zahlung PASS.
- Webhook: `subscriptions` wurde `pro/active` mit Periodenende gesetzt, Events mit `pending_webhooks=0`: PASS. `workspaces.plan` bleibt `free`; die Plan-Auflösung läuft über die Subscription (beabsichtigt).
- **FAIL (gefunden):** Return-/Cancel-URLs zeigten auf `http://localhost:3000` (Env-Fallback), Browser landete nach Zahlung auf einer Fehlerseite.
- Fix: `src/lib/appUrl.ts` ignoriert localhost in Produktion und nutzt `NEXT_PUBLIC_SITE_URL` bzw. die Request-Origin; eingesetzt in `create-checkout` und `create-portal`.
- Re-Verifikation nach Deploy: Neue Checkout-Session hat `success_url=https://closeflow-green.vercel.app/settings/billing?success=1` und `cancel_url=…?canceled=1`: PASS. Session danach abgelaufen (expire).
- Cleanup: Test-Abo per API gekündigt (Webhook setzte `canceled`), Workspace über `/api/workspaces/delete` gelöscht (200).
- Offen: Der Portal-Rücksprung (`create-portal`) wurde nicht live geprüft. Release-Status weiterhin NO-GO.

## Externes Monitoring (2026-10-15)
- Neu: `.github/workflows/health-check.yml` ruft alle 15 Minuten `/api/health` auf (3 Versuche, 15 s Timeout). Bei Fehlschlag schlägt der Workflow fehl; GitHub meldet fehlgeschlagene Läufe per E-Mail an den Repo-Besitzer (Standard-Benachrichtigung, nicht verifiziert).
- Manuell geprüft: Die Live-Antwort enthält `"status":"ok"`, die Prüflogik passt dazu. Ein Lauf in GitHub Actions wurde noch nicht beobachtet (Status: offen), ebenso kein erzwungener Fehlerfall.
- Einschränkung: GitHub-Cron kann sich verzögern und ist kein SLA-Monitoring. Für echte Alarmierung (SMS/Pager) ist ein dedizierter Dienst nötig.

- **Update 2026-10-15 19:16:** Der geplante Lauf #1 (Event `schedule`, 17:15 UTC) von `health-check.yml` ist laut GitHub-API `completed/success`: PASS. Der Fehlerfall und die E-Mail-Benachrichtigung bleiben ungeprüft.

## Stripe- und Workspace-Lifecycle-Follow-up (2026-10-17)
- `npm run test:stripe-api:production` im lokalen Next-Server gegen Stripe-Testmodus und die markierte Remote-Supabase-Fixture: PASS für Checkout-Session-Metadaten, Billing-Portal-Session mit authentifiziertem AAL2-Owner, Business-Upgrade und geplante Free-Kündigung (`cancel_at_period_end=true`). Keine Live-Stripe-API, keine Zahlung und keine E-Mail; alle Testfixtures wurden bereinigt.
- Separater Stripe-Testmodus-Aufruf für eine Portal-Session des aktiven Workspace-Kunden ergab `return_url=https://closeflow-green.vercel.app/settings/billing`. Ein tatsächlicher Portal-Browser-Rundlauf zurück in die App wurde nicht ausgeführt.
- Der einzige aktive Stripe-Testmodus-Subscription-Eintrag ohne Subscription-Metadaten wurde über Subscription-ID und Kunden-ID der DB-Zeile `CloseFlow Workspace` (`business/active`) zugeordnet. Das ist kein herrenloses Abo: Checkout setzt `workspace_id` auf der Checkout-Session; die Verknüpfung wird in der DB gespeichert. Daher kein aktiver, ungeklärter Stripe-Testsubscription-Fund.
- **Korrektur zur Cleanup-Aussage vom 2026-10-15:** Die API antwortete beim Löschen des markierten Test-Workspaces mit 200, aber Workspace und gekündigte Subscription-Zeile blieben bestehen. Ursache: `workspaces` hatte keine DELETE-RLS-Policy; die Route löschte außerdem Memberships vor dem Workspace, wodurch die SELECT-Policy die zurückgegebene Zeile nicht mehr freigab. Der markierte, leere Workspace mit gekündigtem Abo wurde nach Identitäts- und Datenprüfungen gezielt bereinigt.
- Fix: Migration `20261017190000_workspace_owner_delete_policy.sql` ergänzt eine Owner-only DELETE-Policy und wurde auf Supabase angewendet. Die Route prüft nun die tatsächlich gelöschte Zeile und verlässt sich für abhängige Zeilen auf bestätigte `ON DELETE CASCADE`-Constraints. Cross-tenant-Matrix ergänzt um fremde Workspace-Löschung (blockiert) und Owner-Löschung (erlaubt).
- Re-Tests: `npm run test:rls-matrix` ALL PASS; `npm run test:stripe-api:production` ALL PASS einschließlich authentifizierter Workspace-Löschung und Kaskadenprüfung; `npx tsc --noEmit`, gezieltes ESLint und `npm run verify:release` PASS.
- Production-Recheck: Vercel meldete den Deploy von Commit `e500a8d` als erfolgreich. Ein danach ausgeführter, markierter Production-Fixture-Test mit neuem Benutzer und AAL2-TOTP bestätigte HTTP 200 der Workspace-Löschroute sowie das Fehlen von Workspace und Subscription nach der Löschung; User-Fixture ebenfalls bereinigt: PASS.
- Payment failure: Im Stripe-Testmodus wurde eine Subscription mit der fehlschlagenden Test-PaymentMethod angelegt; die erste Rechnungszahlung schlug fehl (`attempt_count=1`, Subscription `incomplete`). Das zugehörige `invoice.payment_failed`-Event war vorhanden (`pending_webhooks=0`); ein mit dem Endpoint-Secret signierter Replay dieses echten Test-Event-Payloads an `/api/stripe/webhook` erhielt HTTP 200. Testkunde und Subscription wurden gelöscht. Der Dashboard-Zustellversuch mit per-Endpoint-HTTP-Response wurde nicht separat eingesehen.
- Status: Migration und API-Fix sind in Produktion und der Workspace-Löschpfad ist live verifiziert. Die synthetische `past_due`-Subscription-Webhooksuite ist separat abgedeckt. Portal-Rücklauf im Browser weiterhin offen. Gesamtstatus bleibt **NO-GO**.
- **Stripe Billing Portal browser round-trip (2026-10-17): PASS.** From the authenticated production `/settings/billing` page, opened the Stripe test-mode portal for the existing CloseFlow Sandbox subscription. Portal loaded in German and displayed the current subscription, €149/month, next billing date, Visa ending 4242, billing details and invoice history. The return link pointed to `https://closeflow-green.vercel.app/settings/billing`; used that return link and landed back on the authenticated billing page. No subscription, payment method, cancellation or customer details were changed. This is a navigation/return-path check only; no billing controls were submitted.

## Release-Gate Durchgang: Authentifizierung und Einladungen (2026-10-17)
- `npm run test:auth-recovery:production` gegen die konfigurierte Supabase-DB und lokalen Next-Dev-Server: PASS. Markierter Nutzer konnte mit Startpasswort anmelden; synthetischer Recovery-Token erzeugte Recovery-Session; Passwortwechsel und Login mit neuem Passwort erfolgreich; Token-Replay abgelehnt; markierter Nutzer entfernt. Es wurde keine Recovery-Mail versandt und kein Browser-Link getestet.
- `npm run test:workspace-invite:production`: PASS für Invite-RPC-Rollenmatrix (owner/admin/sales_manager erlaubt; sales_rep/member/viewer abgewiesen), erfolgreiche Annahme, abgelaufene Einladung, Sitzlimit, abgelaufene Einladungen, Cross-Workspace-Erstellung/-Annahme; markierte Fixtures gelöscht. Dieses Skript versendet keine Einladungs-E-Mail und testet nicht den HTTP-/Browser-Mailfluss.
- Bereits dokumentiert: ungültiger Auth-Callback-Code und externe `next`-Redirects abgelehnt; erfolgreicher OAuth/PKCE-Callback und externe Bestätigungs-/Recovery-/Invite-Mailzustellung weiterhin nicht getestet.
- Entscheidung: **TEILWEISE PASS / TEILWEISE VERTAGT**. Die technischen Token-/RPC-Pfade sind bestanden. SMTP/Domänenverifikation, Zustellung und echter Browser-Link-Rundlauf bleiben offen, bis eine verifizierte Absenderdomain verfügbar ist; erfolgreicher OAuth-Rundlauf erfordert Anmeldung beim Provider. Kein Testkonto blieb zurück.

## Release-Gate Durchgang: KI-Erfolg, Kosten und Fehlerbehandlung (2026-10-17)
- `npm run test:ai-cost`: **15/15 PASS**. Abgedeckt: konfigurierte Modelle/Preise, datierte Modell-IDs, token- und cost-Audit, fehlende Usage-Daten, fehlgeschlagene Audit-Persistenz, Provider-HTTP-Fehler und Transportfehler, unbekanntes Modell ohne erfundenen Preis, ungültige Tokenzahlen und Summary-Query-Fehler.
- `npm run test:ai-route-success:production` mit markiertem synthetischem Benutzer/Workspace und genau einem echten Provider-Aufruf an `/api/ai/email-generator`: **PASS**. HTTP 200 mit nichtleerem synthetischem Inhalt; Quota 0→1 und genau ein AI-Quota-Event sowie ein `ai.usage`-Audit wurden in Supabase verifiziert. Modell `gpt-4.1-mini-2025-04-14`, 128 Input-/106 Output-Token, gespeicherte Kosten `$0.000221` stimmten mit der konfigurierten Modellpreisformel überein. Der verwendete OpenAI-Key funktioniert für diesen Pfad. Die Test-Suite weist die markierte synthetische Fixture plus einen Quota-/Audit-Eintrag ausdrücklich als behalten aus.
- Bereits verifiziert (2026-10-14): 16/16 authentifizierte AI-Endpunkte verweigerten bei erschöpfter Quote mit HTTP 429; Zähler/Event wurden nicht erhöht.
- **Entscheidung: TEILWEISE PASS, Rest vertagt.** Kein vollständiger Provider-Erfolgs-/Fehler-/Kostenlauf für alle 16 Endpunkte: einige Routen verwenden direkte OpenAI-Clients, andere den getrackten Client/Fetch; die eine bezahlte Erfolgsanfrage belegt nur `/api/ai/email-generator`. Eine vollständige Matrix würde weitere Provider-Aufrufe oder ein noch nicht vorhandenes per-route Mock-/Contract-Test-Harness erfordern. Vor GO mindestens diese Unterschiede automatisiert abdecken; keine zusätzlichen echten kostenpflichtigen Calls ohne explizite spätere Entscheidung.

## Release-Gate Durchgang: Mandantenisolation (2026-10-17)
- `npm run test:rls-leak` erneut gegen Produktion: **ALL PASS**, 0 fremde Zeilen sichtbar für `anon` und einen nicht zugehörigen `authenticated`-Nutzer in allen 36 Public-Tabellen. 17/36 Tabellen enthielten Daten, daher waren 19 Tabellenprüfungen leer/vakuos. Die `organization_*`-Tabellen lieferten 42P17 (Policy-Rekursion); dies ist geschlossen fehlgeschlagen, nicht als Datenleck gewertet.
- Aktueller `npm run test:rls-matrix`-Nachweis vom 2026-10-17: **ALL PASS** für 19 Tabellen mit `workspace_id`; 13 konnten mit Fixture-Zeilen befüllt werden. Workspace-DELETE-Prüfung blockiert fremde Workspace-Löschung und erlaubt Owner-Löschung.
- Vorhandene HTTP-Cross-Tenant-Suite: 7/7 negative Such-, Lead-Score-, Next-Action-, Kalender-Update/-Delete- und Export-Probes bestanden (2026-10-14).
- **Entscheidung: TEILWEISE PASS, Rest vertagt.** Keine aussagekräftigen Zeilen für 6 Mutationstabellen (automation_runs, notifications, revenue_events, usage_events, workspace_invites, workspace_members); 19 von 36 Tabellen waren leer. Sechs Tabellen sind absichtlich RLS-ohne-Policy und damit Clientzugriff verweigert/service-role-only. Die `organization_*`-Policies bleiben als geschlossene Altlast mit Rekursionsfehler offen. Vollständige Service-Role-, Background- und Bulk-Pfadprüfung nicht erfolgt; jeder privilegierte Codepfad braucht explizite Workspace-Beschränkung.

## Release-Gate Durchgang: Monitoring, Stripe-Zustellung und Browser-Download (2026-10-17)
- **Monitoring — TEILWEISE PASS / Rest vertagt:** Geplanter GitHub Actions Health-Check hat einen grünen Schedule-Lauf; `/api/health` antwortet 200. Neuer `CRON_SECRET` wurde gegen Produktion mit HTTP 200 geprüft, falscher Wert ergibt 401. Kein kontrollierter Health-503-/GitHub-Failure-Lauf und keine E-Mail-Benachrichtigung erzwungen; Alarm-Einstellungen beim Repo-Konto bleiben unbestätigt.
- **Stripe webhook delivery — TEILWEISE PASS / Rest vertagt:** Stripe-Event `evt_1URaf7Hk7hGwPgsalcN71Fv7` ist `invoice.payment_failed`, `livemode=false`, `pending_webhooks=0`; der Endpoint `https://closeflow-green.vercel.app/api/stripe/webhook` ist aktiv. Signierter Replay desselben Event-Payloads an Produktion erhielt HTTP 200. Der Dashboard-Event ist sichtbar; die Endpoint-Delivery-Response/HTTP-Historie wurde nicht bestätigt, da der Endpoint-Detailbereich des Dashboards während der Prüfung im Ladezustand/429 blieb. `pending_webhooks=0` allein wird nicht als erfolgreicher HTTP-Status ausgegeben.
- **Browser-Download — TEILWEISE PASS / Rest vertagt:** Authentifizierte API-CSV-Exporte mit markierten Daten und korrekten Exportzählern sind früher PASS. Native Download-/Save-Bestätigung im integrierten Browser ist weiter nicht nachgewiesen; es wurde kein Export realer Kundendaten ausgelöst.
- Für diese drei Restprüfungen war kein produktiver Daten- oder Abostatus geändert. Gesamtstatus bleibt **NO-GO** (Backup/Restore ist weiter auf USB-Export/Restore vertagt).

## Lokale Failure-Prüfung und Korrektur der Tenant-Matrix (2026-10-17)
- **Health failure path — PASS lokal:** Ein isolierter Next-Dev-Server verwendete eine nicht erreichbare lokale Supabase-URL. `GET /api/health` antwortete mit HTTP 503 und `{"status":"degraded","checks":{"database":"fail","config":"ok"}}`. Keine Produktionsstörung und kein Monitoring-Alarm wurden ausgelöst. GitHub-Failure-Alarm und Benachrichtigungszustellung bleiben ungeprüft.
- **Korrektur zur bisherigen RLS-Matrix:** Die Matrix wurde so erweitert, dass sie alle 19 Workspace-Tabellen mit gültigen Pflichtfeldern befüllt und bei jedem Insert explizit Workspace B setzt. Der Live-Lauf vor der Migration seedete 19/19 Tabellen und zeigte, dass User A unter den alten permissiven `user_id`-Policies Leads und Activities in Workspace B anlegen konnte. Beide Probes wurden durch Savepoint und abschließendes Rollback vollständig zurückgesetzt; es wurden keine Testzeilen persistiert. Der frühere Lauf mit 13 befüllten Tabellen hatte diese Writes nicht aussagekräftig geprüft und gilt dafür nicht als Nachweis.
- **Policy-Fix live angewendet:** Migration `20261017193000_remove_legacy_owner_only_crm_policies.sql` entfernt die veralteten, nur auf `user_id` prüfenden Lead-/Activity-Policies und stellt sichere, workspace-member-basierte Lead-Policies für Lesen, Erstellen, Ändern und Löschen her. Sie wurde nach Prüfung der Produktions-Projektkennung in einer einzelnen Transaktion angewendet; es wurden keine CRM-Datensätze geändert.
- Remote-Migrations-Ledger abgeglichen: **23/23** lokale SQL-Migrationsdateien sind nun mit den Supabase-Versionseinträgen synchronisiert; keine lokale Migration blieb unregistriert.
- **Live-Nachprüfung:** `npm run test:rls-matrix` ohne Pending-Migration-Option: **ALL PASS**, 19/19 Workspace-Tabellen befüllt; fremde Reads, Updates, Deletes und Inserts blockiert, während berechtigte Workspace-A-Inserts für Leads und Aktivitäten erlaubt bleiben. `npm run test:rls-leak`: **ALL PASS**, keine fremden Datensätze sichtbar für `anon` oder den unabhängigen authenticated User; 17/36 Tabellen enthielten echte Zeilen. Die alten `organization_*`-Policies liefern weiter `42P17` und schließen den Zugriff damit ab.
- `npm run test:workspace-seat-concurrency:production`: **PASS** mit unabhängigen PostgreSQL-Verbindungen: Pro-Einladungsrace 4/8 akzeptiert (5/5 Sitze), AI-Quota-Idempotenz exakt einmal, konkurrierende AI-Quota 2/8 bis genau 500/500 erlaubt, Free-Lead-Race 1/8 bis 50/50 erlaubt, parallele Einladungseinlösung 4/4 erfolgreich. Alle markierten Workspaces und Auth-Fixtures wurden laut Test bereinigt.
- `npm run lint:tenancy`, `npx eslint tests/rls-cross-tenant-matrix.mjs`, `npx tsc --noEmit` und `npm run verify:release`: **PASS**. Der Release-Verify-Build hat 98 statische Seiten generiert; damit sind Build und Tenancy-Guard belegt, nicht jedoch ein Production-Deployment.
- **Tenant-Insert-Blocker geschlossen.** Die frühere lokale RLS-Lücke ist mit der Migration und dem erneuten unveränderten Live-Matrixtest verifiziert. Der Gesamtstatus bleibt **NO-GO**, bis die übrigen offenen Recovery-, Auth-, Monitoring-, Stripe- und Release-Gates belegt sind.
- **Browser-Download bleibt vertagt:** Die Leads-Seite enthält CSV-/Excel-Export-Aktionen; der Export-Endpunkt liefert alle aktiven Leads des Workspace und übernimmt keine UI-Suchfilter. Da die aktuelle Produktionsworkspace echte Kundendaten enthält, wurde kein Download ausgelöst. Ein verlässlicher nativer Downloadnachweis erfordert einen isolierten Workspace mit ausschließlich synthetischen Leads oder eine gleichwertige isolierte Testumgebung.
- Der lokale Dev-Server wurde beendet; die automatisch von Next angepasste `AGENTS.md` ist nicht verändert.

## Öffentliche Feedback-Links und Service-Role-Nachprüfung (2026-10-17)
- Beim Audit des öffentlichen `POST /api/feedback` wurde festgestellt, dass der Endpoint bisher einen frei übermittelten `workspace_id` direkt mit der Service Role in `audit_logs` schrieb. Die öffentliche Feedback-Seite zeigte außerdem den Workspace-Namen nur anhand dieser ID an.
- Code-Fix: Feedback-Links werden jetzt mit HMAC an genau eine Workspace-ID gebunden; die Signatur wird sowohl vor dem Anzeigen des Firmennamens als auch vor dem privilegierten Insert geprüft. Das authentifizierte Feedback-Inbox-API erzeugt den Link. Eingaben für Rating, UUID, E-Mail und optionale Kontaktdaten werden validiert/begrenzt. Es ist keine neue Umgebungsvariable nötig; beim Rotieren des Supabase-Service-Role-Keys müssen bestehende Feedback-Links neu kopiert werden.
- `npm run test:feedback-token`: **1/1 PASS** (richtiger Workspace akzeptiert, abweichender Workspace und veränderte Signatur abgelehnt). Geänderte Feedback-Dateien ESLint: **PASS**. `npm run verify:release` (Tenancy-Guard, TypeScript und Production-Build): **PASS**.
- Dieser Feedback-Code wurde in dieser Prüfung nicht deployed. Die Live-Anwendung akzeptiert bis zu einem App-Deploy weiterhin ihr bisheriges Linkverhalten. Nach Deployment müssen ein neu erzeugter gültiger öffentlicher Link und ein ungültiger/geänderter Token ohne Datenbankeintrag im isolierten Workspace geprüft werden; alte Feedback-Links müssen neu geteilt werden.

## Privilegierte Hintergrundpfade und Workflow-Fehlerbehandlung (2026-10-17)
- Service-Role-Pfade in Cron-Automationen, Onboarding, Admin-Übersicht/-Benutzerverwaltung, Health, Account-Löschung, Stripe-Webhook, AI-Kostenbuchung und Feedback wurden statisch nach Authentifizierung und Workspace-/User-Scope geprüft. Admin-Routen verlangen Platform-Admin-E-Mail plus AAL2; Account-Löschung löscht nur Datensätze mit der angemeldeten User-ID und verlangt AAL2; Onboarding nutzt das authentifizierte Workspace-Erstellungs-RPC-Ergebnis; Stripe-Webhook validiert die Stripe-Signatur; Cron verlangt `CRON_SECRET` und die Daten-/Automationsabfragen sind je Workspace begrenzt.
- Beim Workflow-Cron wurden zuvor Fehler beim Laden von Idle-Leads/überfälligen Tasks sowie bei Workflow-Definitionen, Task-Dedupe-Lesezugriffen und Run-Statusupdates nicht immer bis zum Cron-Ergebnis weitergegeben. Diese Fehler werden nun ausgewertet bzw. explizit weitergegeben; nicht eindeutige Run-Claim-Fehler werden nicht mehr als stilles „keine Automation“ behandelt. Dedupe-Key-Konflikte (`23505`) bleiben erwartete Idempotenz-Skips.
- `npm run test:workflow-automations`: **3/3 PASS** (Definition-Lesefehler sichtbar, Task-Lesefehler markieren Run fehlgeschlagen statt Task doppelt anzulegen, Duplicate-Claim bleibt idempotent). `npm run test:feedback-token`: **1/1 PASS**. Geänderte Backend-Dateien ESLint und `npm run verify:release`: **PASS**.
- Der Test prüft Mock-Verhalten des Workflow-Helfers und ist kein provozierter Fehlerlauf gegen den produktiven Cron-Endpunkt. Es wurde kein Workflow in Produktion gestartet und keine Benachrichtigung versandt.
- Worktree-Änderungen an Feedback-Signaturen und Cron-Fehlerbehandlung sind **nicht deployed**. Der Code-Stand ist daher lokal/reviewbar, nicht der aktuelle Produktions-App-Stand.

## Service-Role- und KI-Mock-Follow-up (2026-10-17)
- Die privilegierten Zugriffe wurden zusätzlich auf Fehlerbehandlung geprüft. `/api/admin/overview` wertete zuvor die Fehler aller sieben Service-Role-Abfragen nicht aus und konnte dadurch unvollständige Admin-Kennzahlen mit HTTP 200 ausgeben. Der lokale Fix protokolliert Query-Fehler serverseitig und liefert stattdessen HTTP 503 mit einer generischen Meldung.
- Der OpenAI-SDK-Client für KI-Kostenbuchung akzeptiert jetzt optionale Fetch- und Audit-Client-Abhängigkeiten, damit Providerantworten ohne echten OpenAI-Aufruf und Datenbankwrites getestet werden können. Der Mock-SDK-Test prüft Erfolgsantwort, Workspace/User-Zuordnung, Tokenzahlen und Kosten für alle 15 `AiFeature`-Kennungen.
- Verifikation: `npm run test:ai-cost` **16/16 PASS**; Feedback-Token **1/1**, Workflow-Automationen **3/3**, Usage-Quota **6/6** und Workspace-Auth **2/2 PASS**. Gezieltes ESLint, TypeScript und `npm run verify:release` (Tenancy-Guard plus Next.js-Produktionsbuild) **PASS**.
- Das sind lokale Code-/Mock-Nachweise. Die Admin-Query-Fehlerantwort wurde nicht gegen einen manipulierten oder ausgefallenen Live-Backend-Dienst injiziert; der Mock-Anbieter ersetzt keine echte Provider-, Kosten- oder Deploymentprüfung. Der direkte Provider-Smoke-Test darf nicht als Abdeckung aller Route-Handler gewertet werden.
- Noch offen im statischen Service-Role-/Lifecycle-Audit: Kontolöschung besteht aus mehreren unabhängigen Löschungen und kann bei Teilfehlern unvollständig bleiben; Onboarding erstellt Workspace und Folgeobjekte nicht als eine atomare Gesamttransaktion. Die Admin-Übersicht lädt für Summen derzeit ganze Subscription-, Usage- und AI-Audit-Ergebnismengen. Diese Pfade brauchen gezielte Failure-/Datenintegritäts- bzw. Skalierungsprüfungen.
- Statische Sichtung der aktuellen Workspace-RPCs/Trigger fand Authentifizierungs- und Workspace-/Rollenprüfungen in den `SECURITY DEFINER`-Schreibfunktionen; die neuen Workspace-, Usage-, Invite- und Lead/Task-Cascade-Funktionen enthalten in ihren Migrationen explizite `REVOKE`-Regeln gegenüber `PUBLIC`/`anon`. Die Storage-Folder-Prüfung begrenzt Zugriffe auf Workspace-Mitglieder.
- Die Legacy-`organization_*`-Invite-RPCs bleiben über `useTeamWorkspace.ts` erreichbar. Ihre Basismigration enthielt keine expliziten `REVOKE`-Statements für `PUBLIC`/`anon`; eine idempotente Folge-Migration ergänzt nun diese Einschränkung und erteilt `authenticated` explizit EXECUTE-Rechte. Diese Migration ist nur lokal angelegt und nicht angewendet. Weiter offen: `accept_organization_invite` sperrt die ausgewählte Einladung nicht per `FOR UPDATE`, und der Token ist optional, wenn die Auth-E-Mail passt. Das ist kein nachgewiesener Cross-Tenant-Zugriff, aber E-Mail-Bestätigung, Parallelannahme und tatsächlicher Bedarf der Legacy-Organisationstabellen müssen separat geprüft werden. Die bekannten `organization_*`-Policy-Rekursionsfehler bleiben fail-closed und ungelöst.
- Diese RPC-Prüfung ist nur statisch anhand der Migrationen und Call-Sites erfolgt. Tatsächliche produktive Grants, Triggerdefinitionen, Tabellenrechte und Laufzeitverhalten wurden nicht live ausgelesen oder verändert. Die neue ACL-Migration ist pending und muss vor dem Release kontrolliert angewendet und verifiziert werden; bis dahin bleiben die produktiven Grants unverändert. Auch die übrigen lokalen Änderungen sind nicht deployed. Gesamtfreigabe bleibt **NO-GO**.

## Synthetische CSV-Import-/Export-Tests (2026-10-17)
- Leads- und Kunden-CSV-Import verwenden jetzt denselben vollständigen Dokumentparser; der Kundenimport verarbeitet damit auch korrekt zitierte Felder mit Zeilenumbrüchen. Der Kundenimport liefert für ungültiges JSON explizit HTTP 400.
- Leads- und Kunden-CSV-Export escapen jetzt Formelpräfixe in Textzellen (CSV formula injection) und behalten korrektes CSV-Quoting für Trennzeichen, Anführungszeichen und Zeilenumbrüche bei; numerische negative Werte bleiben numerisch.
- `npm run test:csv`: **5/5 PASS** für zitierte Kommata/Semikolons, escaped quotes, CRLF, eingebettete Zeilenumbrüche, Trennzeichenerkennung, nicht geschlossene Quotes und Tabellenformel-Escaping.
- Danach alle vorhandenen lokalen Unit-Suites ausgeführt: CSV **5/5**, KI-Kosten **16/16**, Feedback-Token **1/1**, Workflow **3/3**, Usage-Quota **6/6**, Workspace-Auth **2/2**, Workspace-Kapazität **4/4** – insgesamt **37/37 PASS**. Gezieltes ESLint und `npm run verify:release` (Tenancy-Guard und Produktionsbuild) ebenfalls **PASS**. Das vollständige `npm run lint` beendet sich mit **0 Fehlern / 124 Warnungen**; die Warnungen sind vorhanden und nicht als fehlerfreier Lint-Lauf zu zählen.
- Diese synthetischen Unit-Tests führen keine Import-/Export-Routen gegen eine Datenbank aus und beweisen weder RLS noch Schreib-, Rollback-, Teilfehler- oder Download-Verhalten der Endpunkte. Kein produktiver Datenzugriff, Stripe- oder OpenAI-Aufruf wurde für diese Tests vorgenommen.
- Die nächstliegenden Integrationstests benötigen PostgreSQL/Supabase. `supabase status` konnte den lokalen Stack nicht prüfen, weil die Docker-Engine auf diesem Rechner nicht läuft; die vorhandene CLI-Verknüpfung zeigt auf das Produktionsprojekt und wird nicht als Testziel verwendet. Für weitere authentifizierte Route-/DB-Integrationstests ist ein gestarteter Docker-Desktop mit lokaler Supabase-Umgebung oder ein ausdrücklich isoliertes wegwerfbares Testprojekt nötig. Die lokalen Änderungen sind nicht deployed. Gesamtfreigabe bleibt **NO-GO**.

## Lokale Supabase-Neuaufbau-Prüfung (2026-10-17)

Isolierter lokaler Stack (Docker, `127.0.0.1`), kein Zugriff auf Produktion, `.env.local` nicht gelesen.

- **Befund 1 (hoch, Reproduzierbarkeit):** Die Migrationen im Repo lassen sich nicht auf einer leeren Datenbank einspielen. `leads`, `activities` und `tasks` werden nirgends versioniert angelegt, außerdem fehlt `leads.is_vip`. Das Basisschema wurde nur lokal aus `supabase/schema-repair-template.sql` rekonstruiert (`supabase/local-test/baseline.sql`, nur für Tests). Ein Disaster-Recovery-Neuaufbau aus dem Repo ist damit nicht belegt.
- **Befund 2 (hoch, nur frische DB):** `is_workspace_member`/`is_workspace_manager` waren nicht `SECURITY DEFINER`, obwohl die Policies auf `workspace_members` sie aufrufen: unendliche Rekursion (SQLSTATE 54001), die Tests schlugen mit 19 FAIL fehl. Neue Migration `20261017200000_workspace_rls_helpers_security_definer.sql`, **nicht in Produktion angewendet**. Der tatsächliche Produktionsstand der Funktionen wurde nicht ausgelesen (offen).
- **Offen:** Legacy-Tabellen `organizations`, `organization_members`, `organization_invites`, `organization_audit_events` liefern auf frischer DB `42P17` (Policy-Rekursion). Das schlägt fehl-geschlossen, ist aber ungeprüft, ob die App diese Tabellen noch nutzt.
- **Ergebnis lokal (frischer Neuaufbau, alle 25 Migrationen inkl. der drei noch nicht angewendeten):** `test:rls-matrix` 76 PASS / 0 FAIL, `test:rls-leak` ALL PASS. Der Leak-Check ist schwach: nur 2 von 29 Tabellen enthalten Zeilen, und Fehlercodes zählen als PASS.
- **Hinweis:** `supabase/config.toml` setzt `[db.migrations] enabled = false` nur für den lokalen Test. Vor jedem `supabase db push` auf `true` zurücksetzen oder die Datei entfernen.
- Lokaler Lauf: `npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,mailpit,postgres-meta,realtime`, dann `node supabase\local-test\apply-local.mjs`, dann `CLOSEFLOW_LOCAL_DB=1` vor den RLS-Skripten.

## Lokale Route-Integration: Lead-/Kunden-Import und -Export (2026-10-17)

Next.js-Dev-Server (`127.0.0.1:3188`) gegen den lokalen Supabase-Stack, zwei unabhängige synthetische Workspaces, Bearer-Auth. Kein Produktionszugriff; Stripe/OpenAI/Resend mit Platzhaltern deaktiviert. Test: `tests/local-import-export-integration.mjs` (`npm run test:local-import-export`, bricht bei nicht-lokalen Zielen ab).

Ergebnis: **9/9 PASS** — 401 ohne Auth, 400 bei ungültigem JSON und nicht geschlossenem Quote (nichts geschrieben), Lead-Import legt genau eine `created`-Aktivität je Lead an, mehrzeilige Notizen bleiben erhalten, Wiederholung des Imports erzeugt weder Duplikate noch neue Aktivitäten, Workspace B sieht keine Daten von A und importiert gleichnamige Leads unabhängig, Export enthält nur Daten des eigenen Workspace und neutralisiert Formelzellen, Kundenimport ist workspace-begrenzt.

Einschränkungen: Das lokale Schema ist rekonstruiert (siehe oben). `leads.created_by` existiert in keiner Migration; der Lead-Import fiel dadurch auf den Fallback-Insert ohne `created_by` zurück. Ob Produktion die Spalte hat, ist nicht geprüft. Nicht getestet: Teilfehler mitten im Import (Rollback), Kontingentgrenzen beim Import, XLSX-Export, Onboarding und Account-Löschung.

## Lokale Route-Integration: Onboarding und Account-Löschung (2026-10-17)

Gleiche lokale Umgebung wie oben; für die Löschung wurde lokal TOTP aktiviert und eine echte aal2-Session per MFA-Verifikation erzeugt. Test: `tests/local-onboarding-delete-integration.mjs` (`npm run test:local-onboarding-delete`).

**Befunde (vor Korrektur reproduziert, FAIL):**
1. *Onboarding:* Nach einem Teilfehler (Workspace angelegt, danach Fehler) lieferte die Wiederholung „ok“, setzte aber nie `onboarding_completed`. Der Nutzer blieb im halb eingerichteten Zustand. Korrigiert in `src/app/api/onboarding/route.ts`.
2. *Account-Löschung, Mitglied:* Löschte ein Mitglied sein Konto, wurden alle seine Leads in einem gemeinsamen Workspace hart gelöscht (Datenverlust für das Team). Korrigiert: Zeilen in Workspaces mit weiteren Mitgliedern bleiben erhalten.
3. *Account-Löschung, Owner (hoch):* Löschte der Owner eines Workspaces mit weiteren Mitgliedern sein Konto, wurde der gesamte Workspace samt Daten der anderen per `ON DELETE CASCADE` zerstört. Korrigiert: HTTP 409, Konto bleibt bestehen, bis Mitglieder entfernt oder der Workspace gelöscht ist. Ein Owner allein im Workspace kann weiterhin löschen (Workspace wird entfernt).

**Ergebnis nach Korrektur:** 14/14 PASS (401/403/400-Pfade, Mitglied, Owner mit Team, Solo-Owner, Fremd-Workspace unberührt). Import/Export-Suite danach erneut 9/9.

**Offen/Einschränkungen:** Korrekturen sind lokal, nicht deployed. `calendar_events.user_id` hat `ON DELETE CASCADE` auf `auth.users`; Kalendereinträge eines gelöschten Mitglieds in einem gemeinsamen Workspace gehen daher weiterhin verloren (nicht getestet). Die Löschung ist weiterhin nicht transaktional (mehrere Einzelabfragen, danach `deleteUser`). Keine Workspace-Löschung/Owner-Übertragung als eigene Funktion vorhanden. Der Dev-Server-Lauf nutzt lokale Dummy-Werte für Stripe/OpenAI/Resend.

## Lokale Prüfung: Import-Kontingent, Parallelität, XLSX, Kalender-Cascade (2026-10-17)

Gleiche lokale Umgebung. Test: `tests/local-import-limits-integration.mjs` (`npm run test:local-import-limits`).

**Ergebnis: 4 PASS, 1 FAIL (Befund B, bewusst offen gelassen; nach Entfernen des Kalender-Tests aus dieser Datei nicht erneut gelaufen).** FREE-Plan, 55 aktive Leads importiert -> genau 50 gespeichert, 5 mit Limit-Hinweis gemeldet, 50 `created`-Aktivitäten; bei erreichtem Limit kommen keine aktiven Leads dazu, `won`-Leads werden weiter importiert; zwei parallele Importe (30+30 verschiedene Zeilen, Limit 50) überschreiten das Limit nie, melden konsistent und lassen keine verwaisten oder fehlenden Aktivitäten zurück (der Datenbank-Trigger weist den überzähligen Batch als Ganzes ab); XLSX-Export liefert gültige Arbeitsmappe nur mit eigenen Zeilen.

**Befund A (behoben, lokal):** Löschte ein Mitglied sein Konto, wurden dessen Kalendereinträge in gemeinsamen Workspaces per Cascade gelöscht. Jetzt werden Kalendereinträge, Aktivitäten, Aufgaben und Leads in gemeinsamen Workspaces vor der Löschung dem Workspace-Owner zugeordnet (`src/app/api/profile/delete/route.ts`). Das schützt auch vor Cascade-FKs, die das lokale rekonstruierte Schema nicht zeigt. Lösch-Test jetzt 15/15 PASS.

**Befund B (offen, mittel):** Zwei gleichzeitige identische Lead-Importe (gleiche 20 Zeilen) erzeugen 40 statt 20 Leads. Die Dublettenprüfung liest vorab und ist nicht atomar. Ein Unique-Index auf `(workspace_id, lower(name), lower(company))` würde das beheben, könnte aber bestehende Produktionsdaten (Dubletten) und manuelles Anlegen gleichnamiger Leads betreffen. Entscheidung und Datenprüfung stehen aus; nicht geändert.

**Weiter offen:** Kunden-Import unter Parallelität und Kontingenten, nicht-transaktionale Kontolöschung, Teilfehler innerhalb eines Batches (der Batch schlägt als Ganzes fehl, wird gemeldet; keine Teil-Inserts beobachtet).

## Lokale Prüfung: Kunden-Import unter Parallelität und Limits (2026-10-17)

Test: `tests/local-customer-import-concurrency.mjs` (`npm run test:local-customer-import`). Ergebnis: 3 PASS, 1 FAIL.

**PASS:** zwei parallele Importe mit verschiedenen Zeilen (30+30) speichern alle 60 Kunden, jeweils 1:1 mit Lead und `created`-Aktivität, ohne Waisen; Kunden-Import funktioniert bei vollem FREE-Kontingent aktiver Leads (Kunden werden als `won` angelegt und zählen nicht); sequentieller Retry desselben Imports fügt nichts hinzu (10 übersprungen).

**Befund B (erweitert, offen):** Zwei gleichzeitige identische Kunden-Importe erzeugen 40 statt 20 Kunden/Leads, gleiche Ursache wie beim Lead-Import (nicht atomare Dublettenprüfung, kein Unique-Index). Entscheidung zur Lösung steht aus.

Hinweis: Der Kunden-Import fügt zeilenweise ein (Lead, dann Kunde, dann Aktivität) und räumt den Lead bei Kundenfehler wieder ab; ein Abbruch des Servers mitten in der Zeile ist nicht getestet.

## Fix Befund B: Import-Lock gegen parallele Dubletten (2026-10-17, lokal)

Migration `20261017210000_workspace_import_lock.sql` (nicht in Produktion angewendet): Tabelle `workspace_import_locks` (RLS an, keine Policies, Rechte entzogen) plus SECURITY-DEFINER-RPCs `acquire_workspace_import_lock` / `release_workspace_import_lock` mit Mitgliedschaftsprüfung und selbstablaufender Lease (120 s). `src/lib/import-lock.ts` umschließt `POST /api/leads/import` und `POST /api/customers/import`; ein gleichzeitiger zweiter Import wartet bis zu 30 s, danach 409. Danach prüft er gegen den dann aktuellen Bestand.

Lokal: Kunden-Import-Suite 4/4, Import-Limits-Suite 5/5, Import/Export-Suite 9/9 PASS; `tsc` ok.

Grenzen: Der Lock verhindert Dubletten nur zwischen Importen, nicht zwischen Import und gleichzeitigem manuellen Anlegen. Die Importe sind weiterhin nicht atomar (Teilfehler mitten in einer Zeile bleibt möglich, Kunden-Import räumt den Lead bei Kundenfehler ab). Vor Produktion: Migration anwenden, bevor der Code deployt wird, sonst antworten beide Import-Routen mit 503.

## Legacy-RPC `accept_organization_invite`: Härtung und lokaler Test (2026-10-17)

Migration `20261017220000_harden_accept_organization_invite.sql` (nicht in Produktion angewendet). Test: `tests/local-legacy-invite-rpc.mjs` (`npm run test:local-legacy-invite`), 6/6 PASS.

Änderungen: E-Mail kommt nur noch vom authentifizierten Konto (`p_email` wird ignoriert); Konto-E-Mail muss bestätigt sein; Einladungszeile wird mit `FOR UPDATE` gesperrt; `search_path = public, extensions, pg_temp`.

**Befund:** Lokal scheiterte jeder Token-Accept mit `function digest(text, unknown) does not exist`, weil pgcrypto im Schema `extensions` liegt und die Funktion `search_path=public` hatte. Ob Produktion pgcrypto in `public` oder `extensions` hat, ist nicht geprüft. Dieselbe `digest()`-Abhängigkeit hat `create_organization_invite` (`20260713_team_workspace.sql`, Zeile 339) und ist nicht angepasst; offen, bevor der Legacy-Pfad in Produktion als funktionierend gelten darf.

PASS: falscher Nutzer mit fremder `p_email` abgewiesen; falscher Token abgewiesen; unbestätigtes Konto abgewiesen; anonymer Aufruf verweigert; 10 parallele Accepts ergeben genau eine Mitgliedschaft und ein Audit-Event; Wiederverwendung des Tokens wirkungslos.

Hinweis: Die Legacy-Tabellen `organization_*` werden vom Client (`src/hooks/useTeamWorkspace.ts`) weiter genutzt. Der Workspace-Pfad (`accept_workspace_invite_with_limit`) war bereits getestet.

## Kontolöschung transaktional (2026-10-17, lokal)

Migration `20261017230000_delete_account_data_transactional.sql` (nicht in Produktion angewendet): Funktion `delete_account_data(uuid)`, nur `service_role` ausführbar. In einer Transaktion: Workspaces der Person werden mit `FOR UPDATE` gesperrt, Solo/Shared bestimmt, Owner mit Team -> Status `owner_has_members` (Route: 409), Zeilen in Shared-Workspaces an den Owner übergeben, Solo-/NULL-Workspace-Zeilen, Benachrichtigungen, Mitgliedschaften und Profil gelöscht. `src/app/api/profile/delete/route.ts` ruft nur noch diese Funktion und danach `auth.admin.deleteUser`.

Lokal: Lösch-Suite 15/15 PASS, `tests/local-delete-account-rpc.mjs` (`npm run test:local-delete-rpc`) 2/2 PASS (authenticated/anon verweigert; service_role löscht Solo-Daten vollständig); `tsc` ok.

Grenzen: Das Löschen des Auth-Benutzers bleibt ein separater API-Aufruf; schlägt er fehl, sind die Daten bereits entfernt, ein Retry ist idempotent (Funktion liefert `ok`). Ein erzwungener Fehler mitten in der Funktion (Rollback-Nachweis) wurde nicht getestet; die Atomarität beruht auf Postgres-Funktionssemantik. Vor Produktion: Migration vor dem Code-Deploy anwenden, sonst scheitert die Löschung mit 500. Tabellen/Spalten (`notifications`, `profiles`, `user_id` in vier Tabellen) sind lokal aus rekonstruiertem Schema und in Produktion nicht gegengeprüft.

## Weitere lokale Prüfungen: Leak-Check, Lösch-Rollback, Stripe-Webhook (2026-10-18)

**Leak-Check (lokal, `CLOSEFLOW_LOCAL_DB=1`):** Fremder Mandant (eigener Nutzer + Workspace) wird in alle Tabellen mit generischen/gezielten Fixture-Zeilen geschrieben. Ergebnis: 30/30 Tabellen mit echten Fremdzeilen (vorher 2/29), anon und authenticated sehen 0 fremde Zeilen, ALL PASS. Legacy-Tabellen `organization_*` liefern weiterhin einen Fehler (fehl-geschlossen) und zählen als bestanden.

**Rollback `delete_account_data`:** Ein per Trigger erzwungener Fehler mitten in der Funktion lässt Leads und Mitgliedschaft unverändert (3/3 PASS). Damit ist die Atomarität der Löschung nachgewiesen (lokal).

**Stripe-Webhook (`tests/local-stripe-webhook-integration.mjs`, `npm run test:local-stripe-webhook`):** signierte Events mit lokalem Testsecret, kein Kontakt zu Stripe. 8/8 PASS nach Fix: fehlende/falsche/manipulierte Signatur -> 400 ohne Schreibzugriff; Checkout aktiviert nur den Ziel-Workspace; Replay erzeugt kein Duplikat; Upgrade/Cancel betrifft nur die passende Subscription; unbekannte Price-ID führt zu `free`; Checkout ohne `workspace_id` schreibt nichts.

**Befund C (behoben, lokal):** Das Webhook ordnete Events nicht. Ein verspätet zugestelltes, älteres `customer.subscription.updated` setzte ein gekündigtes Abo wieder auf `active`. Fix: Spalte `subscriptions.last_stripe_event_at` (Migration `20261018000000_subscriptions_last_stripe_event.sql`, nicht in Produktion angewendet); Events mit `created` älter als der letzte angewendete werden ignoriert. Reihenfolge: Migration vor Code-Deploy.

**Offen/Hinweis:** Das Webhook setzt `status = canceled`, sobald `cancel_at` gesetzt ist (geplante Kündigung zum Periodenende). Ob Nutzer bis zum Periodenende ihre bezahlten Funktionen behalten, hängt davon ab, wie `status` im Produkt ausgewertet wird; nicht geprüft. `invoice.payment_failed` wird nur geloggt. Checkout/Portal/Change-Plan-Routen wurden lokal nicht gegen Stripe getestet (kein echter Stripe-Kontakt).

## Abo-Status `canceled` und Tarifzugriff (2026-10-18, lokal)

Code-Prüfung: Das Webhook setzt `status = canceled` bei gesetztem `cancel_at` (geplante Kündigung), speichert aber `current_period_end`. Die maßgeblichen Datenbankpfade (`workspace_plan_tier`, `consume_workspace_usage`, Lead-Kapazitäts-Trigger, Seat-Funktionen) und `resolveWorkspacePlan` behandeln `past_due`/`canceled` bis `current_period_end` weiterhin als bezahlt. Ergebnis: Kunden verlieren bei geplanter Kündigung ihre Funktionen **nicht** vorzeitig. Kein Befund.

Test (Webhook-Suite, jetzt 9/9): geplante Kündigung in der Zukunft -> Tarif bleibt `business`; Periode abgelaufen -> `free`; Fortsetzung (`cancel_at` entfernt) -> wieder `active`/`business`; `unpaid` -> `free`.

Schwäche (gering, kein Sicherheitsproblem): `src/lib/usageLimits.ts` (`getWorkspaceUsageContext`) liest nur `subscriptions.plan` ohne Status/Periodenende. Bei abgelaufenem Abo zeigen UI-Vorprüfungen (Seat-/Lead-Vorprüfung, Snapshot im Import) noch den bezahlten Tarif; die datenbankseitige Durchsetzung greift aber korrekt (Import: Batch wird vom Trigger abgelehnt und als übersprungen gemeldet). Nicht geändert; Vereinheitlichung auf `resolveWorkspacePlan` wäre sinnvoll.

`invoice.payment_failed` wird nur geloggt (kein Hinweis an Nutzer, kein Statuswechsel); Stripe setzt danach selbst `past_due`/`unpaid` per Subscription-Event, das verarbeitet wird.

## Plan-Auflösung in `usageLimits.ts` vereinheitlicht (2026-10-18)

`getWorkspaceUsageContext` nutzt jetzt `resolveWorkspacePlan` (Status + Periodenende, Fallback auf `workspaces.plan` ohne Abo), identisch zur Datenbank-Logik (`workspace_plan_tier`). Abgelaufene oder unbezahlte Abos zeigen damit auch in den Vorprüfungen (Seats, Lead-Kapazität, Import-Snapshot) den Free-Tarif. Regression: Import-Suiten 5/5, 9/9, 4/4 PASS, `tsc` ok.

**Lint:** weiterhin 0 Fehler / 124 Warnungen (49 `no-explicit-any`, 32 `set-state-in-effect`, 20 ungenutzte Variablen, 16 `exhaustive-deps`, 4 `purity`, 2 `no-img-element`, 1 aria). Bewusst nicht angefasst: Die meisten betreffen UI-Komponenten ohne automatisierte UI-Tests, Änderungen bergen mehr Regressionsrisiko als Nutzen.

## Stripe-Routen: Autorisierung (lokal, ohne Stripe-Kontakt)

Test: `tests/local-stripe-routes-authz.mjs` (`npm run test:local-stripe-routes`), ALL PASS.

- create-checkout, change-plan, create-portal: 401 ohne Auth, 403 bei aal1, 403 bei Nicht-Owner und bei Fremd-Workspace-Header.
- change-plan: ungültiger Plan -> 400; ohne Stripe-Abo -> 400, Plan unverändert.
- Befund D (behoben): Ein Fehler beim Stripe-Aufruf in create-checkout führte zu einem unbehandelten 500 mit leerem Body. Jetzt JSON-502 ohne Details.
- Nicht prüfbar lokal: echter Stripe-Checkout/Portal (benötigt Stripe-Konto und Domain).

## Abschluss der lokalen Prüfungen

Gesamtfreigabe: **NO-GO**. Offen: Staging/Produktionsvergleich der RLS-Helper, Grants und pgcrypto-Schema; Backup/Restore; E-Mail-, OAuth-, Recovery- und Webhook-URL-Flows; sieben noch nicht angewendete Migrationen; nicht atomare Importe; Dubletten Import vs. manuell; `create_organization_invite`.

## create_organization_invite (lokal)

Befund E (behoben, Migration `20261018010000_harden_create_organization_invite`): Die RPC erlaubte einem Admin, Einladungen mit Rolle Owner/Admin zu erzeugen (Rechteeskalation; der Client ruft die RPC direkt). Zudem fehlte `extensions` im `search_path` (`digest()`), und die Gültigkeit war unbegrenzt. Jetzt: nur Owner dürfen Owner/Admin einladen, Gültigkeit max. 30 Tage, `search_path = public, extensions, pg_temp`.
Test: `tests/local-legacy-invite-rpc.mjs` 10/10. Hinweis: Wirkung in Produktion erst nach Anwenden der Migration; das pgcrypto-Schema dort ist weiterhin ungeprüft.

## Abschlussregression (lokal)

Alle zehn lokalen Suiten (Import/Export, Import-Limits, Kunden-Import, Onboarding/Delete, Delete-RPC, Legacy-Invite, Webhook, Stripe-Routen, RLS-Matrix, Leak-Check) ALL PASS; `npm run verify:release` und `tsc` ohne Fehler. Gesamtfreigabe weiterhin **NO-GO** (Migrationen jetzt acht, noch nicht in Produktion).

## Produktion: Migrationen angewendet (2026-10-18)

Auf ausdrückliche Freigabe des Betreibers (Produktions-DB enthält nur Testdaten: 3 Nutzer, 4 Workspaces, 15 Leads).
- Vorab-Check: pgcrypto in `extensions`; `is_workspace_manager` war nicht SECURITY DEFINER; `…193000` war bereits angewendet.
- Angewendet per `supabase db query --linked` (`db push` scheiterte am DB-Passwort), Versionen in `schema_migrations` eingetragen: `…193000` (idempotent erneut), `…195000`, `…200000`, `…210000`, `…220000`, `…230000`, `20261018000000`, `20261018010000`. Alle ohne Fehler.
- Verifikation: alle Funktionen SECURITY DEFINER mit festem `search_path`; `delete_account_data` nur `service_role`; Spalte `last_stripe_event_at` vorhanden; kein PUBLIC/anon-Grant auf die geprüften Funktionen.
- `rls-cross-tenant-matrix` und `rls-leak-check` gegen Produktion: ALL PASS (Leak-Check: 17 von 37 Tabellen mit echten Zeilen, übrige leer, dort nur schwache Aussage).
- **Code ist nicht deployed.** Produktion läuft mit altem Code gegen die neue DB (Migrationen sind additiv/kompatibel, aber nicht per End-to-End-Test auf der laufenden Produktionsinstanz belegt). Import-Lock, transaktionale Kontolöschung, Webhook-Stale-Guard und 502-Handling wirken erst nach dem Code-Deploy.
- Weiterhin **NO-GO**: Backup/Restore, Domain-Flows, Code-Deploy mit Preview-Smoke offen.

## Preview-Deployment des Release-Kandidaten (2026-10-18)

Branch `release-candidate-2026-10-18` (gepusht, `main` auf GitHub unverändert), Preview via `vercel deploy`. Erster Preview-Build scheiterte, weil `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` im Preview-Environment fehlte (nur Production); der öffentliche Key wurde für Preview ergänzt. Stripe-Variablen sind in Preview bewusst nicht gesetzt.
Test: `tests/preview-smoke.mjs` (`npm run test:preview-smoke`) gegen die Preview-URL mit Produktions-Supabase und zwei markierten Wegwerf-Mandanten, Bereinigung über `delete_account_data` (kein Rest): ALL PASS.
Geprüft: /login 200; 401 ohne Auth auf Export/Import/Delete/Checkout; Lead-Import 2 eingefügt, Wiederholung 0, Mandanten-Isolation; Export nur eigene Zeilen; 3 parallele identische Kunden-Importe -> genau 8 Kunden (Import-Lock); Cross-Tenant-Lesen leer; `workspace_import_locks` nicht lesbar; `delete_account_data` in Produktion funktionsfähig.
Nicht geprüft: Konto-Löschung über die App-Route (braucht aal2), Einladungs-Flow über die App, Stripe-Webhook/Checkout (Preview ohne Stripe-Variablen), E-Mail/OAuth/Recovery. Hinweis: Das Vercel-Bypass-Secret wurde beim Debuggen einmal im Terminal-Log sichtbar; bei Bedarf in den Vercel-Projekteinstellungen rotieren.

## Production-Deployment: Webhook-Fixtures (2026-10-18)

Production-Deployment von `664db1f` live. `tests/stripe-webhook-production.mjs` (Guard erweitert: nur Loopback oder der in `CLOSEFLOW_WEBHOOK_TARGET_HOST` genannte HTTPS-Host) gegen `closeflow-green.vercel.app`, mit lokal signierten Events (Webhook-Secret aus .env.local, Stripe im Testmodus), markiertes Wegwerf-Fixture:
- ungültige Signatur -> abgelehnt, keine DB-Änderung; gültige Signatur wird akzeptiert (belegt, dass das lokale und das Vercel-Webhook-Secret übereinstimmen);
- Checkout-Abschluss legt genau ein Abo an, Replay bleibt bei einer Zeile; Update, past_due, geplante Kündigung und Löschung korrekt persistiert (nutzt die neue Spalte `last_stripe_event_at`);
- Bereinigung verifiziert.
Nicht belegt: Stale-Guard live (nur lokal, Suite 9/9), echte Stripe-Zustellung (Dashboard-Browser nicht bedienbar), Checkout mit echter Stripe-Session.


## Live-App-Smoke und Befund F (2026-10-18)

`tests/live-app-smoke.mjs` gegen `closeflow-green.vercel.app` (Stripe Testmodus, Wegwerf-Fixtures, Cleanup 0 Reste).

**Befund F (Blocker, behoben):** `/api/workspaces/invite/accept` las die Einladung vorab mit der RLS-Session des Eingeladenen. Die Policy erlaubt das nur Workspace-Mitgliedern, daher bekam jeder echte Eingeladene 404. Fix: Annahme laeuft nur noch ueber die RPC `accept_workspace_invite_with_limit` (prueft Token, Ablauf, E-Mail, Sitzplaetze) mit Fehler-Mapping. Commit `03b3e66`, Production-Deploy von `542c719`.

Ergebnis nach dem Deploy: ALL PASS (16 Pruefungen)
- Invite: 401/403, Sales-Manager und Admin koennen nicht Admin/Owner einladen, E-Mail-Fehler ohne Domain rollt die Einladung zurueck.
- Accept: richtige E-Mail 200 (Replay 404), falsche E-Mail 403, abgelaufen 410.
- Checkout (Testmodus): Owner erhaelt checkout.stripe.com-URL, Member 403. create-portal mit unbekanntem Kunden: JSON-Fehler.
- Kontoloeschung: Solo-Owner 200, Team-Owner 409, Team-Mitglied 200 mit Lead-Uebergabe.
- Webhook-Stale-Guard live: aelteres Event reaktiviert nicht, neueres schon.

Der Preview-Lauf zeigte 2 FAILs (Checkout, Stale-Guard), weil Stripe-Variablen nur in Production gesetzt sind; kein Codefehler.

Die Migrationen aus dem Deploy-Plan sind in Produktion angewendet.

## Gesamtstatus: weiterhin NO-GO
Offen: Backup/Restore (USB-Stick); E-Mail-Bestaetigung, OAuth, Recovery und Einladungs-E-Mail (Domain); Live-Modus-Stripe-Zustellung und echte Live-Zahlung; eine harte globale Dublettensperre fuer gleichzeitiges Importieren und manuelles Erstellen.

## CRM-Importe zeilenweise atomar (2026-10-18)

Migration `20261018020000_atomic_crm_import_rows.sql` ist in Production angewendet und in `supabase_migrations.schema_migrations` erfasst. Beide Funktionen laufen als `SECURITY INVOKER`, pruefen Auth-User und Workspace-Mitgliedschaft und akzeptieren hoechstens 100 Zeilen pro RPC-Aufruf. Lead/Kunde und die jeweilige Aktivitaet committen oder rollen je Zeile gemeinsam zurueck; andere Zeilen koennen weiterlaufen.

Der bestehende Importvertrag bleibt: Leads mit gleichem normalisiertem Name/Firma werden aktualisiert, Kunden-Dubletten (Kontakt/Firma) uebersprungen. Die manuelle Lead-Erstellung warnt jetzt bei exakt gleichem Name/Firma, laesst das Erstellen aber bewusst zu. Die Pruefung ist kein globaler Unique-Key; gleichzeitig eintreffende Import-/Create-Anfragen koennen daher noch eine Dublette erzeugen.

Commit `3f32ae6` ist nach `main` gepusht und Production ist live. `tests/live-app-smoke.mjs` gegen `closeflow-green.vercel.app`: **17 PASS, ALL PASS**. Verifiziert wurden Lead-Import (Anlegen, Aktualisieren, Aktivitaeten), Kunden-Import (Dubletten ueberspringen, gueltige Folgezeilen verarbeiten) und manuelle Dublettenwarnung bei weiterhin erlaubtem Erstellen. Wegwerf-Fixtures bereinigt (0 Workspaces, 0 Benutzer). Release-Gates, TypeScript und CSV-Unit-Tests: PASS; gezieltes ESLint: 0 Fehler, 3 bereits vorhandene Warnungen (ein `any`, zwei unbenutzte Werte).

Die lokalen PostgreSQL-Integrationstests konnten nicht laufen: `supabase status` meldet, dass Docker Desktop/Linux Engine nicht erreichbar ist. Die Import-Routen wurden stattdessen gegen Production mit markierten Wegwerf-Fixtures verifiziert. Das Preview-Bypass-Secret wurde am 2026-10-18 ueber die Vercel-CLI rotiert; alte und neue Werte wurden nicht ausgegeben. Gesamtstatus bleibt **NO-GO** wegen der oben genannten USB-/Domain-/Live-Stripe-Punkte.

## Abgeschlossener Stripe-Testmodus-Checkout (2026-10-18)

Eine markierte Production-Testworkspace wurde ueber `POST /api/stripe/create-checkout` in den Stripe-Testmodus geleitet. Hosted Checkout wurde mit einer Stripe-Testkarte abgeschlossen. Stripe meldete die Session als `complete` und `paid`; der echte Testmodus-Webhook aktualisierte die passende Subscription in Production. Damit sind Checkout, Testzahlung und Testmodus-Webhook-Zustellung belegt, nicht aber Live-Modus-Zahlung oder Live-Modus-Webhook-Konfiguration.

Cleanup verifiziert: Test-Subscription storniert, Stripe-Testkunde geloescht sowie Test-Workspace und Auth-Nutzer entfernt. Der Browser hatte fuer den Ruecksprung keine App-Cookies und landete erwartungsgemaess auf Login mit `next=/settings/billing?success=1`; das ist kein Beleg fuer eine angemeldete Post-Checkout-UI-Sitzung.

## Erneute Release-Pruefrunde (2026-10-18)

Alle folgenden Produktionspruefungen verwendeten ausschliesslich zufaellige, markierte Wegwerf-Fixtures. Die jeweiligen Harnesses bestaetigten ihre Bereinigung; es wurden keine echten Kundendatensaetze geaendert.

- `npm run verify:release`, `npx tsc --noEmit` und der Production-Build: **PASS**.
- Alle sieben Unit-Testgruppen (`ai-cost`, `csv`, `feedback-token`, `usage-quota`, `workflow-automations`, `workspace-auth`, `workspace-capacity`): **37/37 PASS**.
- Vollstaendiges `npm run lint`: **0 Fehler, 125 Warnungen** (Exitcode 0); deshalb kein warnungsfreier Lint-Status.
- `tests/live-app-smoke.mjs` gegen `closeflow-green.vercel.app`: **18 PASS, ALL PASS**; Cleanup: 0 Workspaces und 0 Benutzer.
- Production-backed lokale App-Tests: Lead-Lebenszyklus, synthetischer Recovery-Token, Stripe-Test-API, signierte Test-Webhooks, Workspace-Einladungen, konkurrierende Seat-/AI-Quota-/Lead-Limits und erschöpfte AI-Quota: **PASS**. Alle Fixtures wurden bereinigt. Die AI-Quota-Pruefung erhielt fuer alle 16 Routen HTTP 429; sie loeste keinen Provider-Aufruf aus.
- Cross-Tenant-API-Negativtests: **7/7 PASS**; markierte Workspace-/Nutzer-Fixtures wurden bereinigt.
- Zurueckgerollte RLS-Matrix: **20/20 tenantbezogene Tabellen** bestanden Read/Insert/Update/Delete-Isolationspruefungen. Zusaetzliche Leak-Pruefung: **0 fremde Zeilen sichtbar**; 17 von 37 Tabellen enthielten fuer den Leak-Test aussagekraeftige Zeilen. Legacy-Organisationstabellen lieferten Policy-Fehler statt sichtbarer Zeilen.
- Zurueckgerollter Automation-RLS-/Idempotenztest: **4/4 PASS**.
- Read-only Schemaabfrage: **24/24** erwartete Workspace-Tabellen vorhanden und RLS aktiviert. Remote-Migrationshistorie: **30/30** Versionen stimmen mit lokal ueberein, einschliesslich `20261018020000`.
- Production `/api/health`: **HTTP 200**, Datenbank und Konfiguration jeweils `ok`.
- Angemeldeter Production-Browser-Ruecksprung nach Checkout: Login leitete auf `/settings/billing?success=1` weiter; die Billing-Seite lud und zeigte den Subscription-Status `active`. Dabei wurde festgestellt, dass die UI den Rueckgabeparameter nicht bestaetigte.
- Checkout-Rueckmeldung in `src/app/(dashboard)/settings/billing/page.tsx` ergaenzt: Erfolg und Abbruch werden bestaetigt und der jeweilige Queryparameter wird entfernt. Lokaler Browser-Smoke mit markiertem Wegwerf-Account: Erfolgs- und Abbruchmeldung erschienen; nach Refresh erschien keine doppelte Erfolgsmeldung.
- Nach der Checkout-Rueckmeldungs-Aenderung erneut ausgefuehrt: `npm run verify:release`, Production-Build und `npx tsc --noEmit` **PASS**; gezieltes ESLint **0 Fehler**, eine bestehende `react-hooks/set-state-in-effect`-Warnung an der Billing-Lade-Effect-Logik.

Nach dem Start von Docker Desktop wurden die lokale Supabase-Baseline und alle 30 Migrationen erfolgreich auf den lokalen Stack angewendet. Der lokale RLS-Matrixtest bestand fuer 19 tenantbezogene Tabellen; der Leak-Check bestand fuer 30/30 mit Fixture-Zeilen belegte Tabellen. Alle acht lokalen DB-/Routen-Integrationssuiten bestanden: Import/Export, Import-Limits, paralleler Kundenimport, Legacy-Invite-RPC, Account-Loesch-RPC, Onboarding/Loeschung, Stripe-Routen-Autorisierung und Stripe-Webhooks. Die erste Runde deckte eine fehlende `leads.created_by`-Spalte in der lokalen Baseline sowie eine veraltete Test-Erwartung (manuelle Dubletten werden bewusst angelegt) auf. Baseline/Reparaturtemplate wurden an den bestaetigten Production-Schema-Stand angepasst, der Test korrigiert und die betroffenen Suites erneut bestanden. Aenderungen blieben auf lokale Test-/Schema-Vorlagen und die Checkout-Rueckmeldung beschraenkt; keine Production-Daten wurden geaendert.

Production-Deploy `237c9b9` ist **Ready** und `closeflow-green.vercel.app` zeigt auf diesen Deploy. Angemeldeter Live-Browser bestaetigte `Checkout complete`, entfernte `success=1` aus der URL, zeigte weiterhin Abo-Status `active` und wiederholte die Meldung nach Reload nicht. Production `/api/health`: HTTP 200. Unsigned Stripe-Webhook wurde mit HTTP 400 abgewiesen; unauthentifizierter Checkout mit HTTP 401.

Stripe Live bleibt offen: Der zuletzt dokumentierte bezahlte Hosted Checkout und der zugestellte Webhook waren ausdruecklich im Stripe-Testmodus. Vercel zeigt die Stripe-Variablen als nicht exportierbare Secrets; ihr aktueller Inhalt wurde nicht offengelegt. Heute wurde keine Live-Zahlung und keine echte Live-Webhook-Zustellung ausgefuehrt. Vor einem Live-End-to-End-Test muss der Betreiber in Vercel den Live-Secret-Key, Live-Price-IDs und das Live-Webhook-Secret konfigurieren und dort den Modus bestaetigen. Eine echte Zahlung erfordert gesonderte Freigabe des Betrags und des anschliessenden Storno-/Erstattungsverfahrens.

Der Preview-Smoke benoetigt hier nicht konfigurierte Preview-URL und Bypass-Zugang. Domain-gebundene Mail/OAuth-Flows und Backup/Restore bleiben offen. Der Gesamtstatus ist daher weiterhin **NO-GO**.
