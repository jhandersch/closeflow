# CloseFlow Roadmap Execution Board (2026-08-04)

This board translates ROADMAP phases into executable work packets.

## Phase 1 - Release Hardening (Now)

Goal: move release status from CONDITIONAL GO to GO.

### Blocking release gates

- [x] Re-run technical gate: `npm run verify:release`
- [x] Re-run cross-tenant suite: `npm run test:cross-tenant:suite`
- [ ] Run `supabase/schema-health-check.sql` in production target
- [ ] Complete production smoke test (core lifecycle set)
- [ ] Close 24-48h monitoring window without unresolved P0/P1

### Production smoke checklist

Canonical checklist document:
- `docs/production-smoke-run-2026-08-04.md`

1. New user flow
- [ ] Signup
- [ ] Onboarding
- [ ] Workspace assignment
- [ ] Dashboard first load

2. CRM flow
- [ ] Create lead
- [ ] Move lead to contacted
- [ ] Move lead to proposal
- [ ] Move lead to won
- [ ] Validate activity timeline consistency

3. Task flow
- [ ] Create task
- [ ] Complete task
- [ ] Reopen or delete task
- [ ] Validate activity entries (no duplicates)

4. Calendar flow
- [ ] Create meeting event
- [ ] Update event
- [ ] Mark completed
- [ ] Delete event
- [ ] Hard refresh confirms deleted event does not reappear

5. Pipeline flow
- [ ] Drag lead across at least 2 stages
- [ ] Validate stage persistence and timestamp updates

### Evidence to collect

- Command outputs for release gates
- SQL editor output or screenshot for schema health check
- Smoke evidence notes per flow
- Monitoring summary for 24-48h observation window

## Phase 2 - Architecture Cleanup (V1.1)

Goal: unify organization/workspace model to one source of truth.

### Ticket pack

1. CF-ARCH-001: Current state inventory
- Scope: map all usages of organizations and workspaces in API routes, hooks, and SQL policies.
- Deliverable: compatibility matrix with replacement order.
- Acceptance: all dual-model touchpoints identified and prioritized.

2. CF-ARCH-002: Canonical model decision
- Scope: define final canonical tenancy model and field mappings.
- Deliverable: ADR with migration plan.
- Acceptance: approved schema and policy migration path.

3. CF-ARCH-003: Compatibility layer
- Scope: introduce temporary adapter for reads/writes while migrating.
- Deliverable: shared helper layer in server API.
- Acceptance: no feature regression while dual-read mode is active.

4. CF-ARCH-004: Policy consolidation
- Scope: align RLS policies to canonical model.
- Deliverable: idempotent migration set.
- Acceptance: cross-tenant suite remains green pre/post migration.

## Phase 3 - API-Centric Data Access

Goal: reduce direct client Supabase writes in favor of API-routed writes.

### Ticket pack

1. CF-API-001: Direct access audit
- Scope: locate client hooks/components writing directly to Supabase.
- Deliverable: inventory with risk ranking.
- Acceptance: all direct writes documented with replacement target route.

2. CF-API-002: Leads write path refactor
- Scope: move lead mutations to API-first action layer.
- Deliverable: unified mutation helpers and route validations.
- Acceptance: lead create/update/delete works only via API route path.

3. CF-API-003: Task write path refactor
- Scope: migrate task mutations to API route path.
- Deliverable: server-side validation + auditing.
- Acceptance: no direct task writes from client.

4. CF-API-004: Standardized validation
- Scope: introduce shared request validation in high-traffic mutations.
- Deliverable: validation helpers for lead/task/calendar endpoints.
- Acceptance: invalid payloads fail with consistent error schema.

## Phase 4 - Customer Domain Model

Goal: evolve from derived customers to first-class customer entity.

### Ticket pack

1. CF-DOM-001: Customer schema foundation
- Scope: add customers + contacts schema with workspace isolation.
- Deliverable: migration with indexes and RLS.
- Acceptance: CRUD smoke for customers/contacts passes.

2. CF-DOM-002: Lead-to-customer conversion flow
- Scope: explicit conversion operation and lifecycle status.
- Deliverable: API endpoint + UI conversion action.
- Acceptance: converted customers persist independently from lead state.

3. CF-DOM-003: Customer activity/task linkage
- Scope: connect activity/task entities to customer ids.
- Deliverable: query updates + UI timeline updates.
- Acceptance: customer detail renders complete history.

## Phase 5 - Billing Maturity

Goal: production-grade monetization flow.

### Ticket pack

1. CF-BILL-001: Checkout productionization
- Scope: wire Stripe checkout for live plans.
- Deliverable: plan mapping + success/cancel handling.
- Acceptance: end-to-end subscription purchase passes.

2. CF-BILL-002: Portal and cancellation
- Scope: customer portal and cancellation flow.
- Deliverable: route + webhook status sync.
- Acceptance: subscription state stays consistent after cancellation/reactivation.

3. CF-BILL-003: Usage limits enforcement
- Scope: enforce limits by plan tier at API boundary.
- Deliverable: centralized usage checks and limit responses.
- Acceptance: deterministic behavior under quota exceed.

4. CF-BILL-004: Invoice history UI
- Scope: show invoices/payments in settings.
- Deliverable: billing history page.
- Acceptance: account can view and download invoice records.

## Phase 6 - AI Professionalization

Goal: improve grounding, traceability, and consistency of AI outputs.

### Ticket pack

1. CF-AI-001: Prompt grounding policy
- Scope: enforce evidence-backed recommendations in prompts.
- Deliverable: shared prompt strategy doc + implementation constants.
- Acceptance: outputs reference stage/value/activity context when available.

2. CF-AI-002: Explainability payloads
- Scope: return reason blocks (signals used, confidence, caveats).
- Deliverable: response schema update + UI rendering for rationale.
- Acceptance: user can see why recommendation was generated.

3. CF-AI-003: AI quality regression suite
- Scope: add deterministic checks for language and format guarantees.
- Deliverable: test harness for core AI endpoints.
- Acceptance: regressions fail CI before deployment.

## Suggested Delivery Order (after Phase 1)

1. CF-ARCH-001, CF-ARCH-002
2. CF-API-001, CF-API-002
3. CF-ARCH-003, CF-ARCH-004
4. CF-DOM-001, CF-DOM-002
5. CF-BILL-001, CF-BILL-003
6. CF-AI-001, CF-AI-002, CF-AI-003

## Ownership Slots

- Engineering owner: pending assignment
- Product owner: pending assignment
- QA owner: pending assignment
- Release commander: pending assignment
