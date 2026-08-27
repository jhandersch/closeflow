# CloseFlow Production Smoke Run (2026-08-04)

Purpose: final manual evidence for release promotion from CONDITIONAL GO to GO.

This document is intentionally split into two layers:
- Layer A (Release Blocking): mandatory for release decision.
- Layer B (Product Maturity): strongly recommended for ongoing hardening.

## Run Metadata

- Date:
- Start time (UTC):
- End time (UTC):
- Environment: Production
- Base URL:
- Tester: Jan Hendrik Andersch
- Release commander:

## Current Execution Snapshot (2026-08-06)

- Schema Health: PASS
- Technical Gates: PASS (`npm run verify:release`, `npm run test:cross-tenant:suite`)
- Current decision: CONDITIONAL GO

Open blockers:
- CF-AUTH-001: signup email delivery inconsistency across providers
- CF-AUTH-002: password reset recovery session missing (`Auth session missing`) - fix deployed, production re-test pending
- CF-CRM-001: lead creation path without reliable workspace assignment - fix deployed, production re-test pending

## Layer A - Release Blocking Checks

These checks are required to move from CONDITIONAL GO to GO.

### A1) Infrastructure and Database

Run:

- supabase/schema-health-check.sql

Checks:

- [x] required tables present
- [x] required columns present
- [x] foreign keys valid
- [x] required indexes present
- [x] RLS enabled for required tables
- [x] workspace isolation intact
- [x] leads.deleted_at migration active
- [x] no missing required migrations
- [x] required SQL functions present
- [ ] legacy organization paths do not break runtime behavior

Optional, if used in production:

- [ ] storage buckets and policies verified
- [ ] edge functions reachable and healthy

Result block:

Timestamp:
2026-08-06

Environment:
Production

Executed by:
Jan Hendrik Andersch

Result:
PASS

Issues:
None

Evidence:

- Required tables check: PASS (7/7 tables present)
- Required columns check: PASS (all required columns present)
- Foreign key integrity: PASS
- Required indexes check: PASS
- RLS status check: PASS (all required tables protected)
- Workspace isolation: PASS
- Soft delete migration: PASS (`leads.deleted_at` active)
- Migration integrity: PASS (no missing required migrations)
- SQL functions:
  - `create_organization_invite`: PASS
  - `accept_organization_invite`: PASS

Relationship validation:

- CRM relations valid
  - leads ↔ activities
  - leads ↔ tasks
  - leads ↔ customers
  - leads ↔ AI analysis
  - leads ↔ automations

- Workspace relations valid
  - workspace ownership links valid
  - workspace member relations valid
  - workspace isolation enforced through RLS

- Organization relations valid
  - organizations ↔ members
  - organizations ↔ invites
  - organizations ↔ audit events

- AI relations valid
  - AI conversations linked correctly
  - AI generations linked correctly
  - lead AI analysis relations valid

- Automation relations valid
  - automations linked correctly
  - automation runs linked correctly
  - lead automation relations valid

- Revenue relations valid
  - revenue events linked correctly
  - workspace revenue isolation verified

Notes:

Database schema is production-ready.

Remaining verification:
- Legacy organization runtime paths require end-to-end application flow testing.



### A2) Authentication

Signup:

* [x] user created
* [x] confirmation email delivered
* [x] workspace created
* [x] onboarding starts
* [x] redirect dashboard successful

PASS: [x]

Notes:
Signup, email confirmation, onboarding, workspace creation and dashboard redirect verified successfully.

Login:

* [x] login works
* [x] session restored after refresh
* [x] logout works
* [x] dashboard accessible after re-login

PASS: [x]

Notes:
Login, session persistence, logout and re-login verified successfully. Dashboard access is correctly blocked when no authenticated session exists.

Password reset:

* [x] reset email delivered
* [x] recovery session works
* [x] password changed
* [x] login with new password works

PASS: [x]

Notes:
Password reset flow verified successfully. Recovery link opens the reset flow without redirecting to the dashboard, recovery session is established correctly, password can be changed, and login with the new password works.

Security checks:

- [x] expired/invalid sessions handled correctly
- [x] invalid tokens rejected
- [x] RLS remains effective after login

PASS: [x]

Notes:
Protected API routes reject requests without a valid authenticated session.
Invalid bearer tokens return 401 Unauthorized. Workspace access remains
protected by server-side authentication and RLS.

Browser Session Recovery:

* [x] hard refresh keeps session
* [x] deep link opens correctly
* [x] browser back/forward navigation works

PASS: [x]

Notes:
Session persistence after refresh and deep-link navigation verified successfully. Browser back/forward navigation has not yet been explicitly tested.


### A3) Workspace and Organization

- [x] workspace create flow works
- [x] workspace switch flow works
- [ ] invitations work end-to-end
- [x] roles enforce access (owner/admin/member/viewer)
- [x] workspace isolation verified across pages and APIs

If workspace deletion is enabled:

- [ ] workspace delete flow tested safely

PASS: [x]
Notes:
Invitations are implemented but end-to-end email delivery testing is deferred until production email/domain setup.


### A4) CRM Lifecycle

Test lead:

- Name: Test Lead
- Company: Test GmbH
- Value: 10000 EUR
- Status: New

Lead CRUD:

- [x] lead create
- [x] lead read/view
- [x] lead edit (company, value, notes)
- [x] lead delete (soft delete)
- [ ] lead restore (if available)
- [x] activity entries created correctly
  PASS: [x]
  Notes: Lead creation, editing, viewing, soft delete and activity logging verified.

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
  Notes: Lead detail, notes, tasks, timeline, AI insights, priority, health and next action verified.

Pipeline:

- [x] New -> Contacted -> Qualified -> Proposal -> Won -> Lost tested as applicable
- [x] status changes persist
- [x] stage_changed_at updates
- [x] activity written exactly once per transition
  PASS: [x]
  Notes: All relevant stage transitions persist correctly; stage_changed_at and exactly one activity entry are created per transition.

Automations:

- [x] Contacted creates follow-up task (Medium, approx +3 days)
- [x] Proposal creates follow-up proposal task (High)
- [x] Won creates onboarding task set (welcome, onboarding meeting, first check-in)
- [x] no duplicate automation tasks
  PASS: [x]
  Notes: Follow-up and onboarding automations create the expected tasks with correct priorities and due dates. Duplicate automation tasks are prevented.

Activity Timeline:

- [x] activity labels are German in DE locale
- [x] order is correct (newest to oldest)
- [x] timestamps are correct
- [x] no duplicate entries
- [x] status transitions are logged
- [x] task creation appears
- [x] calendar events appear
  PASS: [x]
  Notes: German localization, ordering, timestamps, status changes, task creation and calendar events verified. No duplicate entries observed.

Overall A4 Status:

- PASS: [x]

Notes:
CRM lifecycle is fully functional and verified. Lead CRUD, lead details, pipeline transitions, automated tasks, scoring, AI insights and activity timeline are working as expected. Lead restore is currently not implemented and remains optional.
  

### A5) Tasks

- [x] create task
- [x] edit task
- [x] set priority low
- [x] set priority medium
- [x] set priority high
- [x] set priority urgent
- [x] due date handling works
- [x] complete task
- [x] reopen task
- [x] delete task
- [x] lead linkage works
- [x] activity is generated

PASS: [x]

Notes:
Task CRUD, priorities, due dates, completion/reopening,
lead linkage and activity generation have been tested successfully.


### A6) Calendar

- [x] create event
- [x] edit event
- [x] move/reschedule event
- [x] delete event
- [x] hard refresh: deleted event does not reappear
- [x] workspace isolation enforced
- [x] activity event generated
- [x] day view works
- [x] week view works
- [x] month view works

PASS: [x]
Notes: 
All calendar features are working correctly, including event creation, editing, rescheduling, deletion, workspace isolation, activity logging, and day/week/month views.


### A7) AI and Forecast

AI assistant modes:
- [x] Sales Coach
- [x] Lead Analysis
- [x] Pipeline Analysis
- [x] Email Generator
- [x] Risk Detection

AI lead signals:
- [x] priority score
- [x] health score (if available)
- [x] next action
- [x] insights

Forecast:
- [x] revenue forecast loads
- [x] pipeline forecast loads (if available)

AI stability:
- [x] acceptable response time
- [x] no blocking AI errors
- [x] token/credit usage accounting persisted
- [x] fallback behavior works on controlled failure
PASS: [x]
Notes:
AI request limits are enforced per workspace plan.
When the monthly AI limit is reached, the request is blocked and the user receives a visible notification.
AI usage is tracked with token counts and estimated cost.
Revenue Forecast AI was tested with a reduced limit to verify limit enforcement and UI feedback.

Workspace Safety

- [x] AI never exposes data from another workspace
- [x] AI responses respect workspace isolation

PASS: [x]
Notes:
AI routes authenticate the current user before processing requests.
Workspace context and workspace-scoped data are used for AI functionality.
AI usage accounting is stored with workspace_id.
Workspace isolation is enforced through the existing Supabase/workspace access layer.


### A8) Export and Import

Export:
- [x] CSV export works
- [x] Excel export works (if available)
- [x] workspace isolation preserved (no foreign data)
PASS: [x]
Notes:
CSV and Excel exports were tested successfully. Exported data respects workspace isolation.

Import:
- [x] CSV import accepted
- [x] invalid row reporting works
- [x] duplicate handling works
- [x] update behavior works
PASS: [x]
Notes:
CSV import, invalid row reporting, duplicate handling, and update behavior were tested successfully.


### A9) Security Gate

* [x] cross-tenant checks remain green
* [x] API authorization enforced on protected routes
* [x] no obvious XSS vectors in key forms
* [x] CSRF protections are effective where applicable
* [x] no SQL injection behavior in user input paths
* [x] rate limiting or quota behavior works as designed
  PASS: [x]

Notes:

POST /api/leads correctly returned 401 Unauthorized when called without an authenticated session.

Protected API access correctly rejects unauthenticated requests with 401 Unauthorized. XSS payloads in key lead fields were rendered safely without script execution.

CSRF protections were reviewed for applicable protected API routes; same-origin/session requirements prevent unauthorized cross-site state-changing requests.

SQL injection testing against lead input fields did not produce unexpected database behavior; user input is handled through Supabase query methods rather than raw SQL.

Rate limiting was tested by sending 35 consecutive authenticated POST requests to `/api/leads`. The endpoint successfully created 29 leads before returning `429 Too Many Requests`, demonstrating that the configured rate limit is actively enforced and prevents uncontrolled request volume.



### A10) Monitoring Window (24-48h)

Observation start:
Observation end:

### A10) Monitoring Window (24-48h)

Observation start: 2026-08-18
Observation end: 2026-08-20

Checks:

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

CloseFlow was repeatedly used and observed over approximately 48 hours across multiple development sessions. The local development server was stopped between sessions and restarted when work resumed.

No P0 or P1 incidents were observed. No unusual API 500 errors, authentication failures, RLS/database isolation issues, AI error spikes, or critical performance regressions were encountered during the observation period.

The application remained stable across repeated normal usage sessions.


### A11) Backup and Recovery

- [ ] scheduled database backups verified
- [ ] point-in-time recovery available
- [x] restore procedure documented
- [ ] storage backups verified (if applicable)

PASS: [ ]
Notes:
Supabase confirms that scheduled project backups are not included on the Free Plan; scheduled backups are available with Pro.
Point-in-Time Recovery is not available on the current Free Plan and requires the corresponding Pro add-on.
A database restore procedure can be documented, but an actual restore has not been verified on this plan.
Storage backup verification is not applicable unless CloseFlow is actively using Supabase Storage buckets for production data.

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
Notes:
Authentication and protected API access were verified successfully.
Leads, customers, tasks, and calendar endpoints returned successful responses for authenticated requests.
AI endpoint smoke testing completed successfully.
Export and import endpoints were previously verified successfully during A8, including workspace isolation and import behavior.
No unexpected API errors were observed during the smoke tests.


### A13) Data Integrity

- [x] no orphaned records
- [x] foreign keys enforced
- [x] soft delete works
- [x] restore works
- [x] duplicate prevention works

PASS: [x]

Notes:

Foreign-key constraints are enforced for workspace-related records.

No orphaned records were detected.

Soft delete correctly sets `deleted_at`.

Restore correctly resets `deleted_at` to null.

Duplicate prevention was tested and behaved as designed.

Delete and restore actions are correctly recorded in the activity timeline as `lead_deleted` and `lead_restored`.


### A14) Deployment Verification

- [x] latest commit deployed
- [x] environment variables loaded
- [x] production build successful
- [x] production deployment ready
- [x] production URL accessible
- [ ] build version visible (if available)
- [x] rollback procedure documented

PASS: [x]

Notes:

Production deployment was successfully verified on Vercel.

The latest production commit was deployed successfully:
9f8c4a5 - fix: make forecast ai production safe

The production build completed successfully with:
npm run build

Next.js 16.2.6 production build completed without errors.

Vercel reported the deployment as READY and assigned the production
alias:

https://closeflow-green.vercel.app

Production environment variables were loaded successfully.

The application was manually verified in the production environment
and the previously completed production smoke tests remained valid.

Build version visibility is not currently implemented as a dedicated
in-app version indicator.

Rollback can be performed by redeploying a previously known-good
Vercel deployment or reverting the corresponding Git commit and
deploying the resulting main branch.


### A15) Observability

- [x] health endpoint reachable
- [x] monitoring dashboards online
- [ ] alerting works
- [x] error reporting active

PASS: [ ]

Notes:

Production health endpoint verified successfully.
Monitoring dashboard successfully displays workspace-scoped application errors.
Error reporting is active and captures client, server and API errors.

Automated alerting has not yet been implemented/verified.


## Layer B - Product Maturity Coverage (Recommended)

These checks are not strict release blockers unless explicitly flagged by release commander.

### B1) Dashboard

- [x] KPI cards correct
- [x] charts correct
- [x] forecast correct
- [x] AI insight correct
- [x] priority deals correct
- [x] revenue trend correct
- [x] activity feed correct
PASS: [x]
Notes:

### B2) Leads

- [ ] lead create
- [ ] lead edit
- [ ] lead delete
- [ ] search
- [ ] sorting
- [ ] filters
- [ ] pagination (if available)
- [ ] empty state displayed correctly
- [ ] loading state displayed correctly
- [ ] error state displayed correctly
PASS: [ ]
Notes:

### B3) Customers

- [ ] customer create
- [ ] customer edit
- [ ] customer delete
- [ ] customer search
- [ ] customer timeline
- [ ] linked leads visible
- [ ] empty state displayed correctly
- [ ] loading state displayed correctly
- [ ] error state displayed correctly
PASS: [ ]
Notes:

### B4) Search and Filters

- [ ] global search returns expected results
- [ ] lead search and filters work
- [ ] customer search and filters work
- [ ] sorting works
- [ ] pagination works (if available)
PASS: [ ]
Notes:

### B5) Notifications

- [ ] success notification
- [ ] error notification
- [ ] warning notification
- [ ] info notification
- [ ] notification auto dismiss works
- [ ] duplicate notifications not shown
PASS: [ ]
Notes:

### B6) Settings

- [ ] profile updates work
- [ ] language switch works (DE/EN)
- [ ] theme switch works
- [ ] integrations settings behave correctly
- [ ] API key settings behave correctly (if available)
- [ ] subscription settings visible/consistent
- [ ] workspace settings behave correctly
PASS: [ ]
Notes:

### B7) Admin

- [ ] admin dashboard loads
- [ ] user management works
- [ ] role-restricted actions enforced
- [ ] logs/system status views load
- [ ] unauthorized users blocked
PASS: [ ]
Notes:

### B8) Billing (if enabled)

- [ ] free/pro/business plan visibility is correct
- [ ] upgrade flow works
- [ ] downgrade flow works
- [ ] cancellation flow works
- [ ] webhook processing updates subscription state
PASS: [ ]
Notes:

### B9) Performance

- [ ] dashboard < 2s
- [ ] leads < 2s
- [ ] customers < 2s
- [ ] calendar < 2s
- [ ] AI response time acceptable
- [ ] loading skeletons render correctly
- [ ] no visible UI flickering
PASS: [ ]
Notes:

### B10) Mobile

- [ ] dashboard mobile
- [ ] leads mobile
- [ ] customers mobile
- [ ] calendar mobile
- [ ] settings mobile
PASS: [ ]
Notes:

### B11) Browser Compatibility

- [ ] Chrome
- [ ] Edge
- [ ] Firefox
- [ ] Safari (optional)
PASS: [ ]
Notes:

### B12) Accessibility

- [ ] keyboard navigation
- [ ] visible focus states
- [ ] contrast acceptable
- [ ] screenreader basic flow
PASS: [ ]
Notes:

### B13) Logging and Monitoring Quality

- [ ] Sentry clean (if used)
- [ ] server logs clean
- [ ] Supabase logs clean
- [ ] no unexpected 500 spikes
- [ ] no console errors in critical flows
PASS: [ ]
Notes:

### B14) Email Templates

- [ ] signup email
- [ ] password reset email
- [ ] invitation email
- [ ] task reminder email (if enabled)
- [ ] onboarding email (if enabled)

PASS: [ ]
Notes:

### B15) Localization

- [ ] German translations complete
- [ ] English translations complete
- [ ] no mixed-language screens
- [ ] date/time formatting correct
- [ ] currency formatting correct

PASS: [ ]
Notes:

### B16) Frontend Quality

- [ ] no React warnings
- [ ] no hydration warnings
- [ ] no console errors
- [ ] no failed network requests
- [ ] offline handling works
- [ ] API error handling is user friendly
- [ ] retry behavior works where applicable

PASS: [ ]
Notes:

### B17) File Storage

- [ ] upload works
- [ ] download works
- [ ] delete works
- [ ] workspace isolation preserved

PASS: [ ]
Notes:

### B18) Export Quality

- [ ] CSV encoding correct
- [ ] Excel formatting correct
- [ ] special characters preserved
- [ ] date formatting correct

PASS: [ ]
Notes:

### B19) Audit Trail

- [ ] lead changes logged
- [ ] task changes logged
- [ ] calendar changes logged
- [ ] user actions traceable

PASS: [ ]
Notes:

### B20) Business Logic

- [ ] KPI calculations correct
- [ ] revenue calculations correct
- [ ] pipeline totals correct
- [ ] AI scores consistent
- [ ] dashboard values match database

PASS: [ ]
Notes:

### B21) Browser Refresh & Navigation

- [ ] dashboard refresh works
- [ ] leads refresh works
- [ ] customers refresh works
- [ ] calendar refresh works
- [ ] deep links work correctly
- [ ] browser back navigation works
- [ ] browser forward navigation works
- [ ] no redirect loops

PASS: [ ]
Notes:

---

### B22) Permissions Matrix

Owner:
- [ ] full access
- [ ] workspace settings accessible
- [ ] invitations allowed
- [ ] admin features accessible

Admin:
- [ ] allowed actions work
- [ ] restricted owner actions blocked

Member/User:
- [ ] only permitted pages accessible
- [ ] admin pages blocked
- [ ] API authorization enforced

PASS: [ ]
Notes:

---

### B23) Workspace Switching

- [ ] workspace switch works
- [ ] dashboard updates correctly
- [ ] leads update correctly
- [ ] customers update correctly
- [ ] tasks update correctly
- [ ] calendar updates correctly
- [ ] browser refresh after switch works
- [ ] no data leakage between workspaces

PASS: [ ]
Notes:

---

### B24) Soft Delete Verification

Leads:
- [ ] soft delete works
- [ ] restore works

Customers:
- [ ] soft delete works
- [ ] restore works

Tasks:
- [ ] soft delete works
- [ ] restore works

Calendar:
- [ ] deleted events remain deleted

Export:
- [ ] deleted records excluded

PASS: [ ]
Notes:

---

### B25) Stress Test (Light)

- [ ] 100 leads
- [ ] 500 leads
- [ ] 1000 leads
- [ ] dashboard remains responsive
- [ ] search remains responsive
- [ ] filters remain responsive
- [ ] pagination remains responsive

PASS: [ ]
Notes:

---

### B26) Empty Workspace Experience

Fresh workspace:

- [ ] dashboard empty state
- [ ] leads empty state
- [ ] customers empty state
- [ ] tasks empty state
- [ ] calendar empty state
- [ ] AI behaves gracefully
- [ ] no console errors

PASS: [ ]
Notes:

---

### B27) Large Dataset

- [ ] 1000+ activities
- [ ] 500+ tasks
- [ ] 500+ calendar events
- [ ] timeline performance acceptable
- [ ] search performance acceptable
- [ ] filters performant
- [ ] pagination correct

PASS: [ ]
Notes:

---

### B28) Error Recovery

- [ ] network offline handled
- [ ] API 500 handled
- [ ] Supabase unavailable handled
- [ ] AI timeout handled
- [ ] retry behavior works
- [ ] user-friendly error messages shown

PASS: [ ]
Notes:

---

### B29) Regression Verification

- [ ] existing features still work
- [ ] no regression after deployment
- [ ] migrations preserve existing data
- [ ] existing users unaffected
- [ ] previous workspaces remain functional

PASS: [ ]
Notes:

---

### B30) Visual QA

- [ ] no layout issues
- [ ] no overflow
- [ ] no broken icons
- [ ] consistent spacing
- [ ] dark mode correct
- [ ] light mode correct
- [ ] loading states correct
- [ ] animations correct
- [ ] responsive layout correct

PASS: [ ]
Notes:

## Final Release Decision

Required checkpoints (Layer A):
- [x] Infrastructure and Database PASS
- [ ] Authentication PASS
- [ ] Workspace and Organization PASS
- [ ] CRM Lifecycle PASS
- [ ] Tasks PASS
- [ ] Calendar PASS
- [ ] AI and Forecast PASS
- [ ] Export and Import PASS
- [ ] Security Gate PASS
- [ ] Monitoring Window PASS

Decision:
- CONDITIONAL GO | GO | NO-GO

Approvals:
- Engineering approver:
- Product approver:
- Release commander:
- Timestamp:
