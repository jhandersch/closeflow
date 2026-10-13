# CloseFlow Production Smoke Run

Purpose: final manual evidence for release promotion from CONDITIONAL GO to GO.

Last recorded production run: 2026-08-29. Checklist updated for the current product on 2026-09-24. Checks added or changed in this update are **not yet executed**; prior PASS marks below only describe the earlier run and are not evidence for the current build.

This document is intentionally split into two layers:

- Layer A (Release Blocking): mandatory for release decision.

- Layer B (Product Maturity): strongly recommended for ongoing hardening.

## Run Metadata

- Last recorded run: 2026-08-29; checklist updated: 2026-09-24

- Start time (UTC): —

- End time (UTC): —

- Environment: Production

- Base URL: https://closeflow-green.vercel.app

- Tester: Jan Hendrik Andersch

- Release commander: Jan Hendrik Andersch

## Current Execution Snapshot (2026-08-29)

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

Current status:

All previously release-blocking application issues have been resolved and manually verified in the production environment.

---

## Layer A - Release Blocking Checks

### A1) Infrastructure and Database

Result: PASS [x]

All required database tables, columns, foreign keys, indexes, RLS policies, workspace isolation rules, migrations and required SQL functions were previously verified successfully.

Remaining non-blocking hardening item:

- [ ] Legacy organization runtime paths fully verified end-to-end

Notes:

Database schema and workspace isolation are production-ready. Legacy organization paths remain a hardening item but have not produced any observed production failure.

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
