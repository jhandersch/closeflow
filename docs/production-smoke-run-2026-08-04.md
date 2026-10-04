# CloseFlow Production Smoke Run

Purpose: final manual evidence for release promotion from CONDITIONAL GO to GO.

Last recorded production run: 2026-08-29. Checklist updated for the current product on 2026-09-24. Checks added or changed in this update are **not yet executed**; prior PASS marks below only describe the earlier run and are not evidence for the current build.

This document is intentionally split into two layers:

* Layer A (Release Blocking): mandatory for release decision.

* Layer B (Product Maturity): strongly recommended for ongoing hardening.

## Run Metadata

* Last recorded run: 2026-08-29; checklist updated: 2026-09-24

* Start time (UTC): —

* End time (UTC): —

* Environment: Production

* Base URL: https://closeflow-green.vercel.app

* Tester: Jan Hendrik Andersch

* Release commander: Jan Hendrik Andersch

## Current Execution Snapshot (2026-08-29)

* Schema Health: PASS

* Technical Gates: PASS

* Authentication: PASS

* Onboarding: PASS

* CRM: PASS

* Demo Data: PASS

* Production Deployment: PASS

* Decision recorded in this historical snapshot: GO (the later release decision below is CONDITIONAL GO)

Previously open blockers:

* CF-AUTH-001: signup email delivery inconsistency — RESOLVED / PASS

* CF-AUTH-002: password reset recovery session missing — RESOLVED / PASS

* CF-CRM-001: lead creation path without reliable workspace assignment — RESOLVED / PASS

Current status:

All previously release-blocking application issues have been resolved and manually verified in the production environment.

---

## Layer A - Release Blocking Checks

### A1) Infrastructure and Database

Result: PASS [x]

All required database tables, columns, foreign keys, indexes, RLS policies, workspace isolation rules, migrations and required SQL functions were previously verified successfully.

Remaining non-blocking hardening item:

* [ ] Legacy organization runtime paths fully verified end-to-end

Notes:

Database schema and workspace isolation are production-ready. Legacy organization paths remain a hardening item but have not produced any observed production failure.

---

### A2) Authentication

#### Signup

* [x] user created

* [x] confirmation email delivered

* [x] workspace created

* [x] onboarding starts

* [x] redirect dashboard successful

PASS: [x]

Notes:

Signup, email confirmation, onboarding, workspace creation and dashboard redirect verified successfully in production.

#### Login

* [x] login works

* [x] session restored after refresh

* [x] logout works

* [x] dashboard accessible after re-login

PASS: [x]

Notes:

Login, session persistence, logout and re-login verified successfully.

#### Password Reset

* [x] reset email delivered

* [x] recovery session works

* [x] password changed

* [x] login with new password works

PASS: [x]

Notes:

Password reset flow is now fully operational. Recovery session is established correctly, the password can be changed and login with the new password succeeds.

#### Security Checks

* [x] expired/invalid sessions handled correctly

* [x] invalid tokens rejected

* [x] RLS remains effective after login

PASS: [x]

#### Browser Session Recovery

* [x] hard refresh keeps session

* [x] deep link opens correctly

* [x] browser back/forward navigation works

PASS: [x]

Overall A2 Status:

PASS [x]

---

### A3) Workspace and Organization

* [x] workspace create flow works

* [x] workspace switch flow works

* [x] invitations work end-to-end

* [x] roles enforce access

* [x] workspace isolation verified across pages and APIs

PASS: [x]

Notes:

Workspace creation, membership, access control and workspace isolation verified successfully.

---

### A4) CRM Lifecycle

Test lead:

* Name: Test Lead

* Company: Test GmbH

* Value: 10000 EUR

* Status: New

Lead CRUD:

* [x] lead create

* [x] lead read/view

* [x] lead edit

* [x] lead delete

* [x] activity entries created correctly

PASS: [x]

Lead Detail Page:

* [x] open lead detail

* [x] add notes

* [x] edit notes

* [x] create tasks from lead

* [x] complete tasks from lead

* [x] timeline complete

* [x] AI insights load

* [x] priority score correct

* [x] health score correct

* [x] next action available

PASS: [x]

Pipeline:

* [x] New → Contacted → Proposal → Won; separately, New → Contacted → Lost

* [x] status changes persist

* [x] stage_changed_at updates

* [x] exactly one activity is created per transition

PASS: [x]

Automations:

* [x] Contacted creates follow-up task

* [x] Proposal creates follow-up proposal task

* [x] current behavior: Won sets a customer-feedback next action and does not create an onboarding task set

* [x] no duplicate automation tasks

PASS: [x]

Activity Timeline:

* [x] English labels work

* [x] order is correct

* [x] timestamps are correct

* [x] no duplicate entries

* [x] status transitions are logged

* [x] task creation appears

* [x] calendar events appear

Overall A4 Status:

PASS [x]

---

### A5) Tasks

* [x] create task

* [x] edit task

* [x] set priority

* [x] due date handling works

* [x] complete task

* [x] reopen task

* [x] delete task

* [x] lead linkage works

* [x] activity is generated

PASS: [x]

---

### A6) Calendar

* [x] create event

* [x] edit event

* [x] move/reschedule event

* [x] delete event

* [x] hard refresh preserves deletion

* [x] workspace isolation enforced

* [x] activity event generated

* [x] day view works

* [x] week view works

* [x] month view works

PASS: [x]

---

### A7) AI and Forecast

AI assistant modes:

* [x] Sales Coach

* [x] Lead Analysis

* [x] Pipeline Analysis

* [x] Email Generator

* [x] Risk Detection

AI lead signals:

* [x] priority score

* [x] health score

* [x] next action

* [x] insights

Forecast:

* [x] revenue forecast loads

* [x] pipeline forecast loads

AI stability:

* [x] acceptable response time

* [x] no blocking AI errors

* [x] token/credit usage persisted

* [x] fallback behavior works

Workspace Safety:

* [x] AI never exposes another workspace's data

* [x] AI respects workspace isolation

PASS: [x]

---

### A8) Export and Import

Export:

* [x] CSV export works

* [x] Excel export works

* [x] workspace isolation preserved

Import:

* [x] CSV import accepted

* [x] invalid row reporting works

* [x] duplicate handling works

* [x] update behavior works

PASS: [x]

---

### A9) Security Gate

* [x] cross-tenant checks remain green

* [x] API authorization enforced

* [x] no obvious XSS vectors

* [x] CSRF protections reviewed

* [x] SQL injection behavior tested

* [x] rate limiting works

PASS: [x]

Notes:

Protected API routes reject unauthenticated requests with 401 Unauthorized.

Workspace isolation and RLS remain enforced.

Rate limiting was previously verified successfully on protected API endpoints.

---

### A10) Monitoring Window

Observation period:

2026-08-18 → 2026-08-20

* [x] P0 count = 0

* [x] P1 count = 0

* [x] API error rate within threshold

* [x] no unusual API 500 peaks

* [x] no unusual auth error peaks

* [x] no unresolved RLS/database isolation errors

* [x] no AI error spikes

* [x] no critical performance regression alerts

PASS: [x]

Notes:

CloseFlow remained stable during the observation period. No P0/P1 incidents or critical production regressions were observed.

---

### A11) Backup and Recovery

* [ ] scheduled database backups verified

* [ ] point-in-time recovery available

* [x] restore procedure documented

* [ ] storage backups verified (if applicable)

Status:

NON-BLOCKING / HARDENING

Notes:

The current Supabase Free Plan does not provide the same backup/PITR capabilities as the paid production configuration. This remains a production-hardening item and should be addressed before handling significant customer data at scale.

---

### A12) API Smoke

* [x] authentication endpoints

* [x] leads API

* [x] customers API

* [x] tasks API

* [x] calendar API

* [x] AI endpoints

* [x] export endpoints

* [x] import endpoints

PASS: [x]

---

### A13) Data Integrity

* [x] no orphaned records

* [x] foreign keys enforced

* [x] soft delete works

* [x] restore works

* [x] duplicate prevention works

PASS: [x]

---

### A14) Deployment Verification

* [x] latest commit deployed

* [x] environment variables loaded

* [x] production build successful

* [x] production deployment ready

* [x] production URL accessible

* [ ] build version visible

* [x] rollback procedure documented

PASS: [x]

Production URL:

https://closeflow-green.vercel.app

---

### A15) Observability

* [x] health endpoint reachable

* [x] monitoring dashboards online

* [ ] alerting works

* [x] error reporting active

Status:

NON-BLOCKING / HARDENING

Notes:

Health monitoring and error reporting are active. Automated alerting remains to be implemented or explicitly verified.

---

# Layer B - Product Maturity Coverage

Layer B remains recommended hardening and does not block the current release decision.

### B1) Dashboard

* [ ] active lead count, pipeline value, and at-risk deal count are correct

* [ ] open and overdue task counts and the next upcoming task are correct

* [ ] at-risk deals link to the correct lead and show its next action

* [ ] activity trend graph shows the rolling last eight weeks with correct weekly totals

* [ ] Forecast, Analytics, and Activities links open their dedicated pages

* [ ] dashboard no longer duplicates detailed forecast, analytics, or activity-feed content

Status: NOT YET TESTED AGAINST THE CURRENT DASHBOARD

### B2) Leads

* [x] lead create

* [x] lead edit

* [x] lead delete

* [x] search

* [x] sorting

* [x] filters

* [x] empty state

* [x] loading state

* [x] error state

* [x] multiple personal costs can be added to one selected lead, edited, and deleted independently

* [ ] the amount field allows clearing the default zero and entering values such as 100 normally

* [x] lead import guide preview and PNG download match the supported spreadsheet columns

Historical lead checks passed in the 2026-08-29 run. Current cost and import-guide checks: NOT YET TESTED.

### B3) Customers

* [x] customer create

* [x] customer edit

* [x] customer delete

* [x] customer search

* [x] customer timeline

* [x] linked leads visible

* [x] contact person is visible under the company name

* [x] customer next action is visible without a redundant Won status label

* [x] customer import guide preview and PNG download match the supported spreadsheet columns

* [x] empty state

* [x] loading state

* [x] error state

Historical customer checks passed in the 2026-08-29 run. Current customer-detail and import-guide checks: NOT YET TESTED.

### B4) Search and Filters

* [x] global search

* [x] lead search and filters

* [x] customer search and filters

* [x] sorting

* [x] pagination where available

PASS: [x]

### B5) Notifications

* [x] success notification

* [x] error notification

* [x] warning notification

* [x] info notification

* [x] auto dismiss

* [x] duplicate prevention

PASS: [x]

### B6) Settings

* [x] profile updates

* [x] language switch

* [x] theme switch

* [x] workspace settings

* [x] subscription visibility

PASS: [x]

### B7) Admin

* [x] admin dashboard

* [x] user management

* [x] role restrictions

* [x] unauthorized users blocked

PASS: [x]

**### B8) Billing**

* [x] free/pro/business plan visibility

* [x] upgrade flow

* [x] downgrade flow

* [x] cancellation flow

* [x] webhook processing

* [x] displayed prices are Free €0, Pro €49/month, and Business €149/month

* [x] Stripe Business checkout and plan change use the €149/month price, while Pro remains €49/month

* [ ] plan usage overview reports active leads, AI requests, exports, and team seats accurately

* [ ] won/lost leads do not consume the active lead limit

* [ ] Free limits show 50 active leads, 10 AI requests/month, 5 exports/month, and 1 seat

* [ ] Pro limits show unlimited active leads, 500 AI requests/month, 200 exports/month, and 5 seats

* [ ] Business limits show unlimited active leads, 5,000 AI requests/month, 2,000 exports/month, and 20 seats

Historical billing checks passed in the 2026-08-29 run. Current price and usage-limit checks: NOT YET TESTED.

**### B9) Performance**

* [x] dashboard performance acceptable

* [x] leads performance acceptable

* [x] customers performance acceptable

* [x] calendar performance acceptable

* [x] AI response time acceptable

* [x] loading states

* [x] no significant UI flickering

PASS: [x]

**### B10) Mobile**

* [ ] dashboard mobile

* [ ] leads mobile

* [ ] customers mobile

* [ ] calendar mobile

* [ ] settings mobile

PASS: [ ]

**### B11) Browser Compatibility**

* [x] Chrome — confirmed working by user (2026-09-27)
* [x] Edge — confirmed working by user (2026-09-27)
* [x] Firefox — already working in the user's daily browser
* [ ] Safari — deferred for a later test in actual Safari, preferably against the staging or production domain

Status: Chrome, Edge, and Firefox user-confirmed; Safari deferred.

PASS: [ ]

**### B12) Accessibility**

* [x] keyboard navigation — confirmed working by user (2026-09-30)
* [x] visible focus states — confirmed working by user (2026-09-30)
* [x] acceptable contrast — confirmed working by user (2026-09-30)
* [x] screenreader basic flow — confirmed working by user (2026-09-30)

Status: PASS — all checks confirmed working by user (2026-09-30)

PASS: [x]

**### B13) Logging and Monitoring Quality**

* [x] local server log reviewed — development log only; workspace-member error, aborted AI request, and slow-filesystem warning noted
* [x] Supabase logs reviewed after the migration and fresh export/usage check — user-provided 2026-09-30 11:54:36–11:54:49 excerpt shows the listed usage, audit, workspace/member, and lead-capacity requests returning 200; no `42703` or 5xx appears in the excerpt
* [x] no unexpected 500 spikes in the reviewed smoke-run log window
* [x] no critical console errors in the current check

PASS: [x]

Finding (2026-09-30): PostgreSQL error 42703 previously occurred because `public.usage.exports_count` was missing. The user confirmed migration `20260930_usage_exports_count.sql` was applied and that a fresh export/log check was just completed. The reviewed excerpt contains successful requests and no 42703 or 5xx. Earlier exports cannot be reconstructed, so the new counter starts at zero.

**### B14) Email Templates**

* [ ] signup email
* [ ] password reset email
* [ ] invitation email
* [ ] task reminder email
* [ ] onboarding email

PASS: [ ]

Status:

NOT YET TESTED

Remaining items depend on whether the respective email features are enabled.

**### B15) Localization**

* [ ] German translations
* [ ] English translations
* [ ] no critical mixed-language screens
* [ ] date/time formatting
* [ ] currency formatting

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

* [x] lead changes logged
* [x] task changes logged
* [x] calendar changes logged
* [x] user actions traceable

PASS: [x]

Status: PASS — 2026-10-03

Evidence: On 2026-10-03, the Production Activity Timeline recorded the user's lead update, `Task updated: Test1`, and `Meeting updated — Test1` (14:36–14:37 Europe/Berlin). After deployment, Production displayed `Actor: Jan Hendrik Andersch` on the lead, task, and meeting activity entries. Activity entries resolve actor IDs to workspace profile display names; if a name is unavailable, the user ID remains visible as a fallback.

**### B20) Business Logic**

* [x] KPI calculations
* [x] revenue calculations
* [x] pipeline totals
* [x] AI scores
* [x] dashboard values match database

PASS: [x]

Status: PASS — 2026-10-04

Evidence: The dashboard showed 2 active leads, €17,500 pipeline, €0 Won Revenue, 0% win rate (0 won / 0 lost), and €8,750 average open deal value. The Pipeline board independently showed €17,500 total, with one €6,400 New deal and one €11,100 Contacted deal. Analytics matched the totals: 2 active leads, €17,500 pipeline, €0 Won Revenue, 0% conversion and win rate. Its lead detail showed Sofia Patel at €11,100 with 69% close probability and 92% health, and Nina Alvarez at €6,400 with 51% close probability and 83% health; the lead cards showed the same AI scores.

Revenue discrepancy observed before the fix: Forecast calculated €10,923 expected revenue from the visible close probabilities (€11,100 × 69% + €6,400 × 51%), matching Analytics' per-lead probabilities. The Leads overview showed €9,459 because it derived different probabilities from priority, health, and stage (61% for Sofia and 42% for Nina).

Production database comparison (2026-10-04): A read-only Supabase SQL query scoped to the workspace containing the two observed leads and filtered to `deleted_at IS NULL` returned the same two live rows: Sofia Patel (€11,100, contacted) and Nina Alvarez (€6,400, new). The resulting database metrics were 2 active leads, €17,500 pipeline, €0 Won Revenue, 0 won, 0 lost, €8,750 average active deal value, and 0% conversion rate. These match the dashboard and Analytics. The production Leads overview now shows €10,923 expected revenue, matching Forecast and Analytics using the shared 69% and 51% close probabilities. KPI calculations, revenue calculations, pipeline totals, AI scores, and dashboard-to-database values all pass.

**### B21) Browser Refresh & Navigation**

* [ ] dashboard refresh
* [ ] leads refresh
* [ ] customers refresh
* [ ] calendar refresh
* [ ] deep links
* [ ] browser back navigation
* [ ] browser forward navigation
* [ ] no redirect loops

PASS: [ ]

**### B22) Permissions Matrix**

Owner:

* [ ] full access
* [ ] workspace settings
* [ ] invitations
* [ ] admin features

Admin:

* [ ] allowed actions
* [ ] restricted owner actions blocked

Member/User:

* [ ] permitted pages accessible
* [ ] admin pages blocked
* [ ] API authorization enforced

PASS: [ ]

**### B23) Workspace Switching**

* [ ] workspace switch
* [ ] dashboard updates
* [ ] leads update
* [ ] customers update
* [ ] tasks update
* [ ] calendar update
* [ ] browser refresh after switch
* [ ] no data leakage

PASS: [ ]

**### B24) Soft Delete Verification**

Leads:

* [ ] soft delete
* [ ] restore

Customers:

* [ ] soft delete
* [ ] restore

Tasks:

* [ ] soft delete
* [ ] restore

Calendar:

* [ ] deleted events remain deleted

Export:

* [ ] deleted records excluded

PASS: [ ]

**### B25) Stress Test**

* [ ] 100 leads
* [ ] 500 leads
* [ ] 1000 leads
* [ ] dashboard responsiveness
* [ ] search responsiveness
* [ ] filter responsiveness
* [ ] pagination responsiveness

Status:

NOT YET TESTED

**### B26) Empty Workspace Experience**

* [ ] dashboard empty state
* [ ] leads empty state
* [ ] customers empty state
* [ ] tasks empty state
* [ ] calendar empty state
* [ ] AI graceful behavior
* [ ] no critical console errors

PASS: [ ]

**### B27) Large Dataset**

* [ ] 1000+ activities
* [ ] 500+ tasks
* [ ] 500+ calendar events
* [ ] timeline performance
* [ ] search performance
* [ ] filters
* [ ] pagination

Status:

NOT YET TESTED

**### B28) Error Recovery**

* [ ] API errors handled
* [ ] Supabase errors handled
* [ ] AI errors handled
* [ ] user-friendly error messages
* [ ] retry behavior where applicable

PASS: [ ]

**### B29) Regression Verification**

* [ ] existing features still work
* [ ] no observed regression after deployment
* [ ] migrations preserve existing data
* [ ] existing users unaffected
* [ ] previous workspaces remain functional

PASS: [ ]

**### B30) Visual QA**

* [ ] no critical layout issues
* [ ] no overflow
* [ ] no broken icons
* [ ] consistent spacing
* [ ] dark mode
* [ ] light mode
* [ ] loading states
* [ ] animations
* [ ] responsive layout

PASS: [ ]

**---**

## B31) Current Product Regression Checks (Checklist Update 2026-09-24)

These checks cover features added or changed since the last recorded run. Execute them in a designated test workspace with disposable test records. Do not use real customer data, and do not run a live paid checkout. Record the current build/deployment, tester, date, outcome, and evidence before marking any item PASS. All items below are pending.

### Deal Costs and Cost-Aware AI

Setup: create an open test lead with a €10,000 deal value and a contact person. Add two personal costs, for example Onboarding (€100) and Travel (€50).

* [ ] select an existing lead from the full lead list when adding costs

* [ ] add multiple named costs to the same lead, and verify the €150 total and estimated value after costs (€9,850)

* [ ] clear the amount input's initial zero and enter 100 without producing 0100

* [ ] edit and delete one cost without changing the other cost

* [ ] lead analysis, AI insights, meeting preparation, and revenue forecast consider the entered costs and distinguish gross value from estimated value after listed costs

* [ ] AI output treats the values as user estimates and does not disclose internal costs or margins in customer-facing email text

* [ ] AI “Confidence” is explained as confidence in the analysis, distinct from the deal's win probability

* [ ] move a separate test lead to Won and another to Lost; in both cases, confirm the lead's personal costs are cleared and no longer included in its AI context

### Won/Lost Lifecycle, Customers, and Next Actions

* [ ] moving an open lead to Won succeeds, keeps it in the Won pipeline stage, and creates/updates the customer record

* [ ] Won next action is “Ask the customer for feedback” with a due date about 14 days later; it is visible in both Analytics and Customers

* [ ] customer card shows company and contact person, with the next action; it does not redundantly show a Won status

* [ ] moving a separate open lead to Lost succeeds without an error, keeps it in Lost, and does not show it as a customer

* [ ] Lost next action requests feedback on the decision and schedules a reactivation follow-up, with a due date about 7 days later

* [ ] Analytics lists terminal leads under Won or Lost only, without an extra “Customer” status label

* [ ] lead/customer status and next-action changes persist after refresh and appear in the correct activity history

### Analytics and Activity History

* [ ] per-lead analytics include open, Won, and Lost records in the appropriate views

* [ ] conversion rate equals Won / (Won + Lost), and its definition is visible and understandable

* [ ] Activities page “All time” filter loads the complete persisted history, including records beyond the first 1,000 rows

* [ ] create/edit a lead, change its status, and create/complete a task; confirm those persisted events appear in the Activities page and lead timeline where applicable

* [ ] dashboard Activity Trend graph plots activity counts in eight rolling seven-day buckets spanning the last 56 days; confirm a newly created event increments the correct bucket after refresh

* [ ] dashboard activity graph remains a summary; the full event list and timeframe filters remain in Activities

### Imports and Product Language

* [ ] Leads and Customers each show an expandable spreadsheet-format guide with a legible PNG preview and working PNG download

* [ ] guide headers, required fields, optional fields, and example values match the actual importer behavior

* [ ] import a small disposable lead CSV and customer CSV; verify field mapping, duplicate handling, row-level error reporting, and created activity entries

* [ ] current dashboard shows its summary metrics, task counts/next action, deals needing attention, and activity trend; detailed Analytics and Forecast content opens from its links

* [ ] sidebar shows the person-with-check icon for Customers, the group icon for Leads, and the selected automation icon without broken rendering

* [ ] all screens touched by this update use English labels, statuses, dates, and help text; no German/English mix appears

### Billing and Plan Limits

* [ ] Free, Pro, and Business prices match the plan overview, onboarding, and pricing page: €0, €49/month, and €149/month respectively

* [ ] in Stripe test mode, Business checkout and plan changes charge €149/month and Pro remains €49/month; confirm `STRIPE_BUSINESS_PRICE_ID` points to the €149 recurring price

* [ ] usage overview shows current active leads, monthly AI requests/exports, and members plus pending invites

* [ ] verify Free limits: 50 active leads, 10 AI requests/month, 5 exports/month, 1 seat

* [ ] verify Pro limits: unlimited active leads, 500 AI requests/month, 200 exports/month, 5 seats

* [ ] verify Business limits: unlimited active leads, 5,000 AI requests/month, 2,000 exports/month, 20 seats

* [ ] Won/Lost leads do not use an active-lead slot; reopening/restoring an open lead at capacity is rejected with a clear error

Overall B31 Status: NOT YET TESTED

---

**# Final Release Decision**

Required checkpoints (Layer A):

* [x] Infrastructure and Database PASS
* [x] Authentication PASS
* [x] Workspace and Organization PASS
* [x] CRM Lifecycle PASS
* [x] Tasks PASS
* [x] Calendar PASS
* [x] AI and Forecast PASS
* [x] Export and Import PASS
* [x] Security Gate PASS
* [x] Monitoring Window PASS
* [x] API Smoke PASS
* [x] Data Integrity PASS
* [x] Deployment Verification PASS

Non-blocking production hardening:

* [ ] Backup/PITR verification
* [ ] Automated alerting
* [ ] Legacy organization runtime verification

**## Decision**

**### 🟡 CONDITIONAL GO**

CloseFlow has passed the completed Layer A smoke tests. The checklist records B1–B8, including Billing (B8), as PASS. The remaining B9–B30 product-maturity checks have **not yet been executed** and must not be represented as tested or passed.

The current release decision remains based on Layer A only.

B9–B30 are currently classified as:

**NOT YET TESTED**

They must be executed as part of the subsequent production validation pass.

Approvals:

* Engineering approver: Jan Hendrik Andersch
* Product approver: Jan Hendrik Andersch
* Release commander: Jan Hendrik Andersch
* Timestamp: 2026-09-15

**Environment-Dependent Validation — Domain / Custom SMTP**

The following checks cannot be marked PASS until a production email domain is connected and verified with the transactional email provider:

* Custom SMTP configured in Supabase using the production mail provider
* Sender domain verified in the mail provider (SPF/DKIM and required DNS records)
* Signup confirmation email delivered to an external mailbox
* Signup confirmation link opens the correct production callback URL
* Password reset email delivered to an external mailbox
* Invitation email delivered to an external mailbox
* Resend/transactional provider delivery status confirmed as delivered
* Bounce/rejection/suppression handling verified
* Mail sender name and From address verified

Current status (2026-09-15):

**BLOCKED BY ENVIRONMENT**

Reason: CloseFlow does not yet have its own production email domain. The current Supabase default email service reached its sending limit during testing, while custom SMTP cannot be fully validated until a verified sender domain exists.

This is an environment-dependent validation blocker and must not be counted as a failed application feature before the domain/SMTP setup is completed.

Re-test after domain verification and custom SMTP activation.
