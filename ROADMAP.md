# CloseFlow Implementation Matrix (Now / Next / Later)

This document translates the full product vision into an execution-ready plan with clear status.

Status legend:
- `Now`: Implemented and available in current app
- `Next`: High-priority build targets for the next release cycle
- `Later`: Strategic features after core product hardening

---

## Now

### Core Product Shell
- `Done` Main navigation and app shell: Dashboard, Leads, Pipeline, Customers, AI Assistant, Teams, Settings
- `Done` Login and onboarding flow
- `Done` Dark mode support
- `Done` Responsive layout baseline

### Dashboard
- `Done` KPI cards (core sales and forecast metrics)
- `Done` Pipeline chart and revenue forecast chart
- `Done` Priority deals widget
- `Done` Recent activity widget
- `Done` AI insight cards
- `Done` Tasks summary widget

### Leads and Pipeline
- `Done` Lead list with search/filter/sort
- `Done` Lead create/edit/delete workflow
- `Done` Lead detail with company/contact/deal data, notes, timeline, tasks
- `Done` Pipeline kanban with drag and drop stage updates

### Customers
- `Done` Customers overview generated from lead data
- `Done` Customer detail page with profile/history/revenue summary

### AI Assistant
- `Done` AI assistant page with chat-style interaction
- `Done` Lead analysis mode
- `Done` Pipeline analysis mode
- `Done` Sales coach and email generator quick actions
- `Done` API integration through `POST /api/sales-copilot`

### Teams and Security
- `Done` Organizations/members/invites/audit-event schema
- `Done` Invite creation and acceptance RPCs
- `Done` Team role management in UI
- `Done` RLS policies for CRM core and team tables

### Settings
- `Done` Profile and company settings
- `Done` Notification settings baseline
- `Done` Integration toggles baseline
- `Done` Subscription tier selection baseline
- `Done` Password/session/2FA metadata controls

### Developer Operations
- `Done` Schema repair bootstrap script
- `Done` Schema health-check script
- `Done` Metadata backfill script for team migration
- `Done` API tenancy regression guard (`npm run lint:tenancy`)
- `Done` One-command release gate (`npm run verify:release`)
- `Done` Production go-live checklist with cross-tenant negative tests (`docs/go-live-checklist.md`)
- `Done` Cross-tenant probe seeding and full-suite command (`npm run test:cross-tenant:seed`, `npm run test:cross-tenant:suite`)
- `Done` Explicit release GO/NO-GO decision matrix (`docs/release-acceptance-matrix.md`)
- `Done` Successful production build validation

---

## Next

### Authentication and Account
- `Build` Registration page and full sign-up journey
- `Build` Forgot password flow
- `Build` Email verification UX hardening

### Lead and Customer Depth
- `Build` Separate relational `customers` table (instead of derived view)
- `Build` Contacts model (`contacts`) and relation to leads/customers
- `Build` Archive/unarchive leads
- `Build` Merge duplicates workflow
- `Build` Pagination and bulk actions for large lead sets

### Productivity
- `Build` Global notifications center (in-app inbox)
- `Build` Global search endpoint and search UI
- `Build` Command palette (`Cmd/Ctrl + K`)
- `Build` Calendar module (meetings, follow-ups, deadlines)

### AI Expansion
- `Build` Persisted AI conversations (`ai_conversations`, `ai_messages`)
- `Build` Lead-specific AI memory and action persistence
- `Build` Forecast explainability by stage/time buckets

### Teams and Permissions
- `Build` Permission matrix (`permissions`) and role mapping (`team_roles`)
- `Build` Team leaderboard and analytics module
- `Build` Team activity log UI from `organization_audit_events`

### File and Communication
- `Build` File upload/storage and attachment references per lead/customer
- `Build` Email and call logging entities (first-class records)

---

## Later

### Reporting and Intelligence
- `Plan` Report builder (revenue, conversion, team performance)
- `Plan` Dashboard widget customization (`dashboards`, `dashboard_widgets`)
- `Plan` Saved report exports and scheduled reports

### Integrations and Billing
- `Plan` Stripe subscriptions, invoices, payments as full backend flows
- `Plan` Google/Gmail/Outlook/Slack/Discord/Zapier live integrations

### Enterprise Readiness
- `Plan` Advanced audit logging and security history
- `Plan` Rate limiting, abuse controls, and stronger API quotas
- `Plan` Localization and translation management for multilingual UX

### Performance at Scale
- `Plan` Query optimization + caching strategy for large datasets
- `Plan` List virtualization where data volume requires it
- `Plan` Background processing for AI/report jobs

---

## Target Data Model Progress

### Existing core tables
- `Ready` `leads`, `activities`, `tasks`
- `Ready` `organizations`, `organization_members`, `organization_invites`, `organization_audit_events`

### Planned expansion tables
- `Next/Later` `customers`, `contacts`, `task_comments`, `meetings`, `calls`, `emails`, `notes`, `files`, `tags`, `lead_tags`, `pipeline_stages`, `deals`, `forecasts`, `ai_insights`, `ai_conversations`, `ai_messages`, `notifications`, `notification_settings`, `integrations`, `subscriptions`, `invoices`, `payments`, `audit_logs`, `invitations`, `team_roles`, `permissions`, `dashboards`, `dashboard_widgets`, `settings`

---

## Release Focus

### Release A (stability + missing auth)
- Complete registration/forgot-password/verification
- Notifications center + global search
- Customers relational model and migration path

### Release B (productivity + team ops)
- Command palette
- Calendar and scheduling workflow
- Team analytics + permission matrix

### Release C (scale + monetization)
- Billing backend integration (Stripe)
- Reporting suite
- Enterprise security hardening
