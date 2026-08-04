# CloseFlow Production Smoke Run (2026-08-04)

Purpose: final manual evidence for release promotion from CONDITIONAL GO to GO.

## Run Metadata

- Date:
- Start time (UTC):
- End time (UTC):
- Environment: Production
- Base URL:
- Tester:
- Release commander:

## 1) Schema Health Check (Production SQL)

Run:
- supabase/schema-health-check.sql

Check:
- [x] required tables present
- [x] required columns present
- [x] foreign keys valid
- [x] RLS enabled for required tables
- [ ] legacy organization paths do not break runtime behavior
- [x] leads.deleted_at migration active
- [x] workspace isolation intact

Result block:

Timestamp:
2026-08-04 20:45

Environment:
Production

Executed by:
Jan Hendrik Andersch

Result:
PASS

Issues:
Nicht über das aktuelle UI verifizierbar.
Cross-Tenant-Suite bestanden.
Keine Runtime-Fehler in den produktiv genutzten Workspace-Endpunkten festgestellt.

Evidence:
- Required tables check: PASS (7/7 tables present)
- Required functions check:
  - accept_organization_invite: PASS
  - create_organization_invite: PASS
- npm run test:cross-tenant:suite
- Result: PASS
- Checks:
  - calendar update isolation: ok
  - calendar delete isolation: ok
  - leads export isolation: ok
  - customers export isolation: ok
- Cross-tenant isolation:
  PASS

- Pending schema checks:
  - RLS policies
  - Foreign key validation
  - Legacy organization runtime verification

- Foreign key validation: PASS
- Verified constraints:
  - activities_workspace_id_fkey
  - leads_created_by_fkey
  - leads_user_id_fkey
  - leads_workspace_id_fkey
  - tasks_assigned_to_fkey
  - tasks_lead_id_fkey
  - tasks_user_id_fkey

- RLS validation: PASS
- Verified tables:
  - activities
  - calendar_events
  - leads
  - notifications
  - tasks

## 2) Auth Smoke

### Signup
- [ ] create new user
- [ ] workspace created
- [ ] onboarding starts
- [ ] redirect dashboard successful
PASS: [ ]
Notes:

### Login
- [ ] login works
- [ ] session persists after refresh
- [ ] redirect to dashboard works
PASS: [ ]
Notes:

### Password Reset
- [ ] reset request works
- [ ] password update works
- [ ] login with new password works
- [ ] reset flow completed
PASS: [ ]
Notes:

## 3) CRM Lifecycle Smoke

Test lead:
- Name: Test Lead
- Company: Test GmbH
- Value: 10000 EUR
- Status: New

### Lead create
- [ ] lead appears in list
- [ ] activity entry exists (lead created)
- [ ] data visible only in own workspace
PASS: [ ]
Notes:

### Lead edit
- [ ] update company saved
- [ ] update value saved
- [ ] update notes saved
- [ ] update activity entry exists
PASS: [ ]
Notes:

### Pipeline status flow
Path:
- New -> Contacted -> Qualified -> Proposal -> Won

For each transition verify:
- [ ] status changed and persisted
- [ ] activity written exactly once
- [ ] automation triggered

Expected automation checks:
- Contacted:
  - [ ] task title contains Follow up: Test Lead
  - [ ] priority Medium
  - [ ] due date is approximately +3 days
- Proposal:
  - [ ] task title contains Follow up proposal
  - [ ] priority High
- Won:
  - [ ] Welcome customer task exists
  - [ ] Schedule onboarding meeting task exists
  - [ ] First customer check-in task exists

PASS: [ ]
Notes:

## 4) Tasks Smoke

- [ ] create task
- [ ] change priority to Low
- [ ] change priority to Medium
- [ ] change priority to High
- [ ] change priority to Urgent
- [ ] complete task
- [ ] reopen task
- [ ] delete task
PASS: [ ]
Notes:

## 5) Calendar Smoke

- [ ] create event
- [ ] edit event
- [ ] complete event (if flow is available)
- [ ] delete event
- [ ] hard refresh: deleted event does not reappear
- [ ] cross-workspace event access is blocked
- [ ] activity event exists for calendar changes
PASS: [ ]
Notes:

## 6) AI Smoke

### AI Assistant
Prompts:
- Lead Analysis
- Pipeline Analysis
- Sales Coach
- Email Generator
- Risk Detection

Checks:
- [ ] response returned
- [ ] no UI/API error
- [ ] usage accounting persisted
PASS: [ ]
Notes:

### Lead AI
- [ ] score works
- [ ] next action works
- [ ] insights render correctly
PASS: [ ]
Notes:

### Forecast
- [ ] revenue forecast loads
PASS: [ ]
Notes:

## 7) Export/Import Smoke

### Export
- [ ] leads export generated (csv)
- [ ] only own workspace data included
- [ ] no foreign workspace records
PASS: [ ]
Notes:

### Import (optional but recommended)
- [ ] import file accepted
- [ ] expected records created/updated
- [ ] invalid rows reported correctly
PASS: [ ]
Notes:

## 8) Monitoring Window (24-48h)

Observation start:
Observation end:

Checks:
- [ ] P0 count = 0
- [ ] P1 count = 0
- [ ] API error rate < 1%
- [ ] no unusual auth error peaks
- [ ] no unresolved RLS/database isolation errors
- [ ] no AI error spikes
- [ ] no unusual API 500 peaks
PASS: [ ]
Notes:

## 9) Final Release Decision

All required checkpoints:
- [ ] Schema Health PASS
- [ ] Smoke Test PASS
- [ ] Monitoring Window PASS

Decision:
- CONDITIONAL GO | GO | NO-GO

Approvals:
- Engineering approver:
- Product approver:
- Release commander:
- Timestamp:
