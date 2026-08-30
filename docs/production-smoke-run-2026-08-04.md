# CloseFlow Production Smoke Run (2026-08-29)

Purpose: final manual evidence for release promotion from CONDITIONAL GO to GO.

This document is intentionally split into two layers:

* Layer A (Release Blocking): mandatory for release decision.
* Layer B (Product Maturity): strongly recommended for ongoing hardening.

## Run Metadata

* Date: 2026-08-29
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
* Layer B testing completed through: B1
* Current decision: GO

Previously open blockers:

* CF-AUTH-001: signup email delivery inconsistency — RESOLVED / PASS
* CF-AUTH-002: password reset recovery session missing — RESOLVED / PASS
* CF-CRM-001: lead creation path without reliable workspace assignment — RESOLVED / PASS

Current status:

All previously identified release-blocking application issues have been resolved and the relevant production flows have been verified.

Layer B product-maturity testing has currently been completed only through B1 (Dashboard). B2–B30 remain untested and are explicitly classified as pending product-maturity verification.

---

# Layer A - Release Blocking Checks

## A1) Infrastructure and Database

Result: PASS [x]

All required database tables, columns, foreign keys, indexes, RLS policies, workspace isolation rules, migrations and required SQL functions were previously verified successfully.

Remaining non-blocking hardening item:

* [ ] Legacy organization runtime paths fully verified end-to-end

Notes:

Database schema and workspace isolation are production-ready. Legacy organization paths remain a hardening item but have not produced any observed production failure.

---

## A2) Authentication

### Signup

* [x] user created
* [x] confirmation email delivered
* [x] workspace created
* [x] onboarding starts
* [x] redirect dashboard successful

PASS: [x]

Notes:

Signup, email confirmation, onboarding, workspace creation and dashboard redirect verified successfully in production.

### Login

* [x] login works
* [x] session restored after refresh
* [x] logout works
* [x] dashboard accessible after re-login

PASS: [x]

Notes:

Login, session persistence, logout and re-login verified successfully.

### Password Reset

* [x] reset email delivered
* [x] recovery session works
* [x] password changed
* [x] login with new password works

PASS: [x]

Notes:

Password reset flow is fully operational. Recovery session is established correctly, the password can be changed and login with the new password succeeds.

### Security Checks

* [x] expired/invalid sessions handled correctly
* [x] invalid tokens rejected
* [x] RLS remains effective after login

PASS: [x]

### Browser Session Recovery

* [x] hard refresh keeps session
* [x] deep link opens correctly
* [x] browser back/forward navigation works

PASS: [x]

Overall A2 Status:

PASS [x]

---

## A3) Workspace and Organization

* [x] workspace create flow works
* [x] workspace switch flow works
* [x] invitations work end-to-end
* [x] roles enforce access
* [x] workspace isolation verified across pages and APIs

PASS: [x]

Notes:

Workspace creation, membership, access control and workspace isolation verified successfully.

---

## A4) CRM Lifecycle

Test lead:

* Name: Test Lead
* Company: Test GmbH
* Value: 10000 EUR
* Status: New

### Lead CRUD

* [x] lead create
* [x] lead read/view
* [x] lead edit
* [x] lead delete
* [x] activity entries created correctly

PASS: [x]

### Lead Detail Page

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

### Pipeline

* [x] New → Contacted → Qualified → Proposal → Won → Lost
* [x] status changes persist
* [x] stage_changed_at updates
* [x] exactly one activity is created per transition

PASS: [x]

### Automations

* [x] Contacted creates follow-up task
* [x] Proposal creates follow-up proposal task
* [x] Won creates onboarding task set
* [x] no duplicate automation tasks

PASS: [x]

### Activity Timeline

* [x] German labels work
* [x] order is correct
* [x] timestamps are correct
* [x] no duplicate entries
* [x] status transitions are logged
* [x] task creation appears
* [x] calendar events appear

Overall A4 Status:

PASS [x]

---

## A5) Tasks

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

## A6) Calendar

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

## A7) AI and Forecast

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

## A8) Export and Import

### Export

* [x] CSV export works
* [x] Excel export works
* [x] workspace isolation preserved

### Import

* [x] CSV import accepted
* [x] invalid row reporting works
* [x] duplicate handling works
* [x] update behavior works

PASS: [x]

---

## A9) Security Gate

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

## A10) Monitoring Window

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

## A11) Backup and Recovery

* [ ] scheduled database backups verified
* [ ] point-in-time recovery available
* [x] restore procedure documented
* [ ] storage backups verified (if applicable)

Status:

NON-BLOCKING / HARDENING

Notes:

The current Supabase Free Plan does not provide the same backup/PITR capabilities as the paid production configuration. This remains a production-hardening item.

---

## A12) API Smoke

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

## A13) Data Integrity

* [x] no orphaned records
* [x] foreign keys enforced
* [x] soft delete works
* [x] restore works
* [x] duplicate prevention works

PASS: [x]

---

## A14) Deployment Verification

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

## A15) Observability

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

Layer B is recommended hardening and does not block the current release decision.

**Testing status:** Completed through B1 only.

---

## B1) Dashboard

* [x] KPI cards correct
* [x] charts correct
* [x] forecast correct
* [x] AI insight correct
* [x] priority deals correct
* [x] revenue trend correct
* [x] activity feed correct

PASS: [x]

---

## B2) Leads

* [ ] lead create
* [ ] lead edit
* [ ] lead delete
* [ ] search
* [ ] sorting
* [ ] filters
* [ ] pagination
* [ ] empty state
* [ ] loading state
* [ ] error state

Status:

NOT YET TESTED

---

## B3) Customers

* [ ] customer create
* [ ] customer edit
* [ ] customer delete
* [ ] customer search
* [ ] customer timeline
* [ ] linked leads visible
* [ ] empty state
* [ ] loading state
* [ ] error state

Status:

NOT YET TESTED

---

## B4) Search and Filters

* [ ] global search
* [ ] lead search and filters
* [ ] customer search and filters
* [ ] sorting
* [ ] pagination where available

Status:

NOT YET TESTED

---

## B5) Notifications

* [ ] success notification
* [ ] error notification
* [ ] warning notification
* [ ] info notification
* [ ] auto dismiss
* [ ] duplicate prevention

Status:

NOT YET TESTED

---

## B6) Settings

* [ ] profile updates
* [ ] language switch
* [ ] theme switch
* [ ] workspace settings
* [ ] subscription visibility

Status:

NOT YET TESTED

---

## B7) Admin

* [ ] admin dashboard
* [ ] user management
* [ ] role restrictions
* [ ] unauthorized users blocked

Status:

NOT YET TESTED

---

## B8) Billing

* [ ] free/pro/business plan visibility
* [ ] upgrade flow
* [ ] downgrade flow
* [ ] cancellation flow
* [ ] webhook processing

Status:

NOT YET TESTED / FUTURE

---

## B9) Performance

* [ ] dashboard performance acceptable
* [ ] leads performance acceptable
* [ ] customers performance acceptable
* [ ] calendar performance acceptable
* [ ] AI response time acceptable
* [ ] loading states
* [ ] no significant UI flickering

Status:

NOT YET TESTED

---

## B10) Mobile

* [ ] dashboard mobile
* [ ] leads mobile
* [ ] customers mobile
* [ ] calendar mobile
* [ ] settings mobile

Status:

NOT YET TESTED

---

## B11) Browser Compatibility

* [ ] Chrome
* [ ] Edge
* [ ] Firefox
* [ ] Safari

Status:

NOT YET TESTED

---

## B12) Accessibility

* [ ] keyboard navigation
* [ ] visible focus states
* [ ] acceptable contrast
* [ ] screenreader basic flow

Status:

NOT YET TESTED

---

## B13) Logging and Monitoring Quality

* [ ] server logs reviewed
* [ ] Supabase logs reviewed
* [ ] no unexpected 500 spikes
* [ ] no critical console errors

Status:

NOT YET TESTED

---

## B14) Email Templates

* [ ] signup email
* [ ] password reset email
* [ ] invitation email
* [ ] task reminder email
* [ ] onboarding email

Status:

NOT YET TESTED

---

## B15) Localization

* [ ] German translations
* [ ] English translations
* [ ] no critical mixed-language screens
* [ ] date/time formatting
* [ ] currency formatting

Status:

NOT YET TESTED

---

## B16) Frontend Quality

* [ ] no critical React warnings
* [ ] no hydration warnings
* [ ] no critical console errors
* [ ] no failed critical network requests
* [ ] API error handling
* [ ] retry behavior where applicable

Status:

NOT YET TESTED

---

## B17) File Storage

* [ ] upload
* [ ] download
* [ ] delete
* [ ] workspace isolation

Status:

NOT YET TESTED / NOT YET ENABLED

---

## B18) Export Quality

* [ ] CSV encoding
* [ ] Excel formatting
* [ ] special characters
* [ ] date formatting

Status:

NOT YET TESTED

---

## B19) Audit Trail

* [ ] lead changes logged
* [ ] task changes logged
* [ ] calendar changes logged
* [ ] user actions traceable

Status:

NOT YET TESTED

---

## B20) Business Logic

* [ ] KPI calculations
* [ ] revenue calculations
* [ ] pipeline totals
* [ ] AI scores
* [ ] dashboard values match database

Status:

NOT YET TESTED

---

## B21) Browser Refresh & Navigation

* [ ] dashboard refresh
* [ ] leads refresh
* [ ] customers refresh
* [ ] calendar refresh
* [ ] deep links
* [ ] browser back navigation
* [ ] browser forward navigation
* [ ] no redirect loops

Status:

NOT YET TESTED

---

## B22) Permissions Matrix

### Owner

* [ ] full access
* [ ] workspace settings
* [ ] invitations
* [ ] admin features

### Admin

* [ ] allowed actions
* [ ] restricted owner actions blocked

### Member/User

* [ ] permitted pages accessible
* [ ] admin pages blocked
* [ ] API authorization enforced

Status:

NOT YET TESTED

---

## B23) Workspace Switching

* [ ] workspace switch
* [ ] dashboard updates
* [ ] leads update
* [ ] customers update
* [ ] tasks update
* [ ] calendar update
* [ ] browser refresh after switch
* [ ] no data leakage

Status:

NOT YET TESTED

---

## B24) Soft Delete Verification

### Leads

* [ ] soft delete
* [ ] restore

### Customers

* [ ] soft delete
* [ ] restore

### Tasks

* [ ] soft delete
* [ ] restore

### Calendar

* [ ] deleted events remain deleted

### Export

* [ ] deleted records excluded

Status:

NOT YET TESTED

---

## B25) Stress Test

* [ ] 100 leads
* [ ] 500 leads
* [ ] 1000 leads
* [ ] dashboard responsiveness
* [ ] search responsiveness
* [ ] filter responsiveness
* [ ] pagination responsiveness

Status:

NOT YET TESTED

---

## B26) Empty Workspace Experience

* [ ] dashboard empty state
* [ ] leads empty state
* [ ] customers empty state
* [ ] tasks empty state
* [ ] calendar empty state
* [ ] AI graceful behavior
* [ ] no critical console errors

Status:

NOT YET TESTED

---

## B27) Large Dataset

* [ ] 1000+ activities
* [ ] 500+ tasks
* [ ] 500+ calendar events
* [ ] timeline performance
* [ ] search performance
* [ ] filters
* [ ] pagination

Status:

NOT YET TESTED

---

## B28) Error Recovery

* [ ] API errors handled
* [ ] Supabase errors handled
* [ ] AI errors handled
* [ ] user-friendly error messages
* [ ] retry behavior where applicable

Status:

NOT YET TESTED

---

## B29) Regression Verification

* [ ] existing features still work
* [ ] no regression after deployment
* [ ] migrations preserve existing data
* [ ] existing users unaffected
* [ ] previous workspaces remain functional

Status:

NOT YET TESTED

---

## B30) Visual QA

* [ ] no critical layout issues
* [ ] no overflow
* [ ] no broken icons
* [ ] consistent spacing
* [ ] dark mode
* [ ] light mode
* [ ] loading states
* [ ] animations
* [ ] responsive layout

Status:

NOT YET TESTED

---

# Final Release Decision

## Required Checkpoints — Layer A

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
* [ ] Build version visibility

## Decision

### 🟢 GO

CloseFlow is approved for production release based on the completed Layer A smoke tests and successful verification of the previously identified release blockers.

Layer B product-maturity testing has currently been completed through **B1 — Dashboard**.

**B2–B30 have not yet been tested** and are explicitly marked as pending. These checks are product-maturity/hardening work and do not block the current release decision.

Approvals:

* Engineering approver: Jan Hendrik Andersch
* Product approver: Jan Hendrik Andersch
* Release commander: Jan Hendrik Andersch
* Timestamp: 2026-08-29
