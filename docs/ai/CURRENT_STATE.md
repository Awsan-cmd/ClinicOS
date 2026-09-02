# ClinicOS Current State

## Current Stage

Phase 2I — Appointment Type Management.

## Verified Recovery Point

- Latest verified functional commit: `f1a5a73c23344b223f5a3823b1983faba7ad1d93` — `feat(api): implement phase2i appointment type management`.
- Latest repository documentation commit: pending — this documentation update.
- Phase 1 device-session enforcement and revocation foundations are implemented.
- Required device-session enforcement helper is implemented.
- Full test suite currently validates the Phase 1 platform foundation.

## Completed In This Sprint

- Initial monorepo directory structure.
- npm workspaces.
- Root TypeScript configuration.
- ESLint and ESLint flat configuration.
- Vitest and root smoke test.
- Verified typecheck, lint, and test execution.
- Phase 0 infrastructure foundation completed and pushed.
- Phase 1 tenancy foundation completed and pushed.
- Phase 2E Calendar Foundation implemented, committed, pushed, and remotely verified.
- Phase 2F Scheduling / Appointment Foundation implemented, committed, pushed, and remotely verified.
- Phase 2G Appointment Lifecycle implemented, committed, pushed, and remotely verified.
- Phase 2H Schedule Availability implemented, committed, pushed, and remotely verified.
- Phase 2I Appointment Type Management implemented, committed, pushed, and remotely verified.
- Continuous documentation and recovery-point policy established.
- Phase 1A database foundation completed and validated.
- Phase 1B identity foundation implemented and validated.
- Phase 1C session foundation implemented and validated.
- Phase 1D RBAC foundation implemented and validated.
- Phase 1E audit foundation implemented and validated.
- Phase 1F device identity and capability foundation implemented and validated.
- Phase 1G device access foundation implemented and validated.
- Phase 1H device session foundation implemented and validated.
- Phase 1I device session enforcement foundation implemented and validated.
- Phase 1J device-session revocation propagation implemented and validated.
- Phase 1K device-session lifecycle hardening implemented and validated.
- Phase 1L device-session creation hardening implemented and validated.
- Session creation now rejects already-expired sessions at the database boundary.
- Session creation now reports whether a session row was actually inserted.
- Session creation remains scoped to active tenant/device/user authorization.
- Full validation passes with 76 tests.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Session touch requires matching tenant, device, and user identity.
- Session touch requires active, non-expired session state.
- Session touch requires current active device access.
- Session touch requires current active device state.
- Active-session validation rechecks current authorization state.
- Cross-tenant session operations remain denied.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Revoking device access immediately revokes matching active device sessions.
- Revoking a device immediately revokes matching active device sessions.
- Device-access revocation is tenant-scoped.
- Device revocation is tenant-scoped.
- Session propagation remains bound to the exact tenant, device, and user relationship.
- Existing revoked sessions are not rewritten unnecessarily.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Device session checks enforce tenant, device, and user identity.
- Revoked and expired sessions are denied.
- Revoked devices are denied.
- Revoked device access is denied.
- Positive authorization is returned only after all security checks pass.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Device sessions are explicitly bound to tenant, device, and user.
- Sessions require active device access and an active device at creation.
- Sessions have explicit lifecycle state and expiration.
- Session touch requires active access, active device state, and non-expired session state.
- Session revocation is tenant-scoped.
- No general-purpose device session update helper is exposed.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Device access is explicitly bound to tenant, device, and user.
- Device access may be branch-scoped.
- Device access supports explicit revocation.
- Active device access is required for access checks.
- No general-purpose device access update helper is exposed.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Devices are explicitly tenant-bound and may be branch-bound.
- Android platform identity includes API level and app version.
- Device capabilities are explicitly represented.
- Device connectivity and heartbeat state are persisted.
- Devices support explicit revocation.
- Heartbeat updates are accepted only for active devices.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Audit events are explicitly tenant-bound.
- Audit events may attribute actions to users and branches.
- Structured audit metadata is stored as JSONB.
- Audit persistence exposes creation only; no update/delete helper is provided.
- Audit retrieval is indexed by tenant and creation time.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Application permissions are represented as strongly typed permission identifiers.
- Initial role-to-permission matrix defined for owner, admin, manager, doctor, receptionist, and nurse.
- Authorization checks deny inactive users.
- Authorization checks deny permissions not assigned to the user's role.
- Authorization context remains explicitly tenant-bound and may include branch context.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Session identity is bound to user and tenant context.
- Session expiration and explicit revocation are supported.
- Raw session tokens are not persisted; only token hashes are stored.
- Transaction-safe database migration `0002_sessions.sql` added.
- Session persistence helpers added to `@clinicos/db`.
- Current implementation recovery point is tracked by the latest verified Git commit.

- User identity and application role types added.
- Authentication request/response contracts added.
- Authenticated users are explicitly bound to `TenantContext`.
- ESM relative imports use explicit `.js` specifiers for NodeNext compatibility.
- Current implementation recovery point is tracked by the latest verified Git commit.

- PostgreSQL client pool and transactional migration runner added.
- `schema_migrations` tracking prevents already-applied migrations from being re-executed.
- Node.js and PostgreSQL TypeScript definitions added for workspace type safety.
- Current implementation recovery point is tracked by the latest verified Git commit.

- Current repository recovery point is maintained by the latest verified commit.

## Phase 2I — Appointment Type Management

- Appointment types are modeled as tenant-bound catalog records.
- Each appointment type has an optional branch scope, stable code, name, optional description, active state, and creation timestamp.
- Appointment type codes are unique within a tenant.
- Branch references are tenant-aware at the database layer.
- `GET /api/v1/appointment-types` requires `appointment_type:read`.
- `POST /api/v1/appointment-types` requires `appointment_type:manage`.
- Appointment type listing and creation follow authenticated tenant and branch context.
- Appointment type creation records an authenticated actor in the audit event.
- Duplicate appointment type codes return API `409 Conflict`.
- Invalid input and malformed JSON return API `400`.
- Existing `appointments.appointment_type` remains unchanged for compatibility; catalog integration is deferred to a later phase.
- Out of scope for Phase 2I: booking rules, conflict prevention, waitlist, recurring appointments, online booking, calendar UI, and appointment lifecycle changes.
- Validation:
  - Targeted appointment type suite: 10 tests passed.
  - Full Vitest suite: 27 test files, 219 tests passed.
  - Workspace TypeScript typecheck passed.
  - Workspace ESLint passed.
  - `git diff --check` passed.
- Functional recovery point: `f1a5a73c23344b223f5a3823b1983faba7ad1d93`.

## Documentation System

Development is documented continuously.

- `docs/IMPLEMENTATION_PLAN.md` — implementation roadmap.
- `docs/TECHNICAL_SPECIFICATION.md` — technical architecture and specifications.
- `docs/INTEGRATIONS.md` — integration architecture and external capabilities.
- `docs/ai/CURRENT_STATE.md` — verified current repository state.
- `docs/ai/DECISIONS.md` — important architecture and implementation decisions.
- `docs/ai/CHANGELOG.md` — chronological implementation and validation history.

Documentation is updated as part of the implementation workflow before significant commits.


## API Authentication Foundation

- Session-token authentication is implemented at the API boundary.
- Bearer tokens are extracted from the `Authorization` header.
- Session tokens are hashed with SHA-256 before database lookup.
- Active sessions are resolved through the dedicated database session-auth helper.
- User identity is resolved within the session tenant context.
- Authenticated requests receive explicit `AuthenticatedUser` and `TenantContext`.
- `GET /api/v1/me` returns the authenticated user and tenant/branch context.
- Missing authentication returns HTTP 401.
- Valid session authentication returns HTTP 200.
- API authentication tests are present and passing.
- Authentication implementation commit: `af166c9`.

## Current Recovery Point

- `main` is synchronized with `origin/main`.
- Latest commit: `f1a5a73c23344b223f5a3823b1983faba7ad1d93` (`feat(api): implement phase2i appointment type management`).
- Working tree was clean after the Phase 2I functional commit.
- `LOCAL_HEAD == REMOTE_HEAD` verified after the Phase 2I push.
- The previous `af166c9`, `c2f9ee1`, and `ca5d32b` commits remain historical recovery points.

## Latest API Request Context Hardening

- `createRequestContext()` is executed once for each incoming API request.
- The resulting context is passed explicitly into the route handler.
- The route handler no longer creates a second request context.
- This preserves a single request-scoped authentication/context object throughout routing.
- Commit: `c5fc751`.
- Validation:
  - TypeScript typecheck passed.
  - ESLint passed.
  - Vitest: 15 test files passed.
  - Vitest: 86 tests passed.
  - `git diff --check` passed.

## Latest Verified Repository Snapshot

- Verified: 2026-09-02
- Branch: `main`
- Current recovery point is the verified Phase 2I Appointment Type Management commit: `f1a5a73c23344b223f5a3823b1983faba7ad1d93`.
- Phase 2A Staff, Phase 2B Providers, Phase 2C Services, Phase 2D Patients, Phase 2E Calendar Foundation, Phase 2F Appointment Foundation, Phase 2G Appointment Lifecycle, and Phase 2H Schedule Availability are implemented.
- Patient database migration: `database/migrations/0008_patients.sql`
- Patient branch-integrity migration: `database/migrations/0011_patients_tenant_branch_fk.sql`
- Patient DB access: `packages/db/src/patients.ts`
- API routes:
  - `GET /api/v1/patients`
  - `POST /api/v1/patients`
- Patient listing authorization: requires `patient:read`
- Patient creation authorization: requires `patient:manage`
- Tenant scoping: uses authenticated user's `tenantId`
- Branch scoping: uses authenticated user's `branchId` when present
- Patient creation persists tenant, optional branch, creator identity, demographic/contact fields, and audit event
- Patient medical record number uniqueness: database constraint `UNIQUE (tenant_id, medical_record_number)`
- Patient branch references are tenant-aware at the database layer.
- Duplicate medical record numbers return API `409 conflict`
- Patient creation and audit event are committed transactionally
- Repaired the historical migration chain by removing the duplicate/incomplete device definition from `0001_initial_tenancy.sql`; `0004_devices.sql` remains the canonical device migration.
- Clean-database migration validation completed successfully through `0011_patients_tenant_branch_fk`.
- Full validation:
  - Vitest: 22 test files, 136 tests passed.
  - Workspace TypeScript typecheck passed.
  - Workspace ESLint passed.
  - `git diff --check` passed.
- Calendar Foundation and Appointment Foundation are implemented and validated.
- Appointment Lifecycle is implemented and validated.
- Phase 2G lifecycle scope includes confirm, complete, cancel, no-show, and reschedule operations with tenant/branch isolation, transactional updates, and audit events.
- Out of scope for Phase 2G: conflict detection, recurring appointments, waitlist, online booking, reminders/notifications, calendar UI, automatic no-show, and advanced booking rules.


## 2026-09-01 — API Session Logout Lifecycle Hardening

- Added authenticated `POST /api/v1/logout`.
- Logout authenticates through the existing API session-token boundary.
- `AuthenticatedUser` now carries the authenticated `sessionId`.
- Logout revocation is bound simultaneously to `sessionId`, `userId`, and `tenantId`.
- Session revocation only affects an unrevoked matching session.
- A failed session revocation is rejected and does not report successful logout.
- Successful logout creates a tenant/user/session-attributed audit event.
- A revoked session can no longer authenticate subsequent API requests.
- Added behavioral logout route coverage.
- Added Phase 1 session-security regression coverage.
- Accidental untracked file `tatus --short` was removed; it was confirmed to contain only captured diff output and was not part of the project.
- Validation completed:
  - `git diff --check` passed.
  - Workspace TypeScript typecheck passed.
  - Workspace ESLint passed.
  - Vitest passed: 19 test files, 107 tests.
- Current implementation remains within Phase 1 Platform / Identity and Security Foundation.

- Protected API routes now use a shared required-authentication boundary.
- Inactive users are rejected during authentication before reaching protected handlers.
- Runtime roles not present in the centralized permission matrix fail closed with no permissions.
- Authorization therefore returns denial rather than raising an internal error for an unmapped runtime role.
- Phase 1 authentication/authorization security hardening is implemented and validated with the current test suite.
- Current implementation recovery point is tracked by the latest verified Git commit.

## Current Implementation State

### Phase 2G — Appointment Lifecycle

Implemented and validated:

- `POST /api/v1/appointments/:id/confirm`
- `POST /api/v1/appointments/:id/complete`
- `POST /api/v1/appointments/:id/cancel`
- `POST /api/v1/appointments/:id/no-show`
- `POST /api/v1/appointments/:id/reschedule`
- Lifecycle mutations require `appointment:manage`.
- Tenant and authenticated branch isolation are enforced at the database boundary.
- Allowed transitions are enforced transactionally with row locking.
- Terminal appointment states cannot transition further.
- Rescheduling is limited to `scheduled` and `confirmed` appointments and changes only appointment times.
- Lifecycle mutations create tenant/user/branch-attributed audit events.
- Validation completed: Vitest 25 files / 184 tests, workspace TypeScript typecheck, workspace ESLint, and `git diff --check` all passed.
- Functional recovery commit: `962f77a9f2dcc5aba7dcbc09bd2b69e8855b34cf`.


### Phase 2A — Staff

Staff management is now implemented as the first Phase 2 domain slice.

Implemented components:

- `database/migrations/0009_staff_providers.sql`
- `packages/types/src/staff.ts`
- `packages/db/src/staff.ts`
- `apps/api/src/routes/staff.ts`
- `apps/api/tests/staff-route.test.ts`
- Staff permissions:
  - `staff:read`
  - `staff:manage`

API endpoints:

- `GET /api/v1/staff`
- `POST /api/v1/staff`

Security and data-boundary guarantees:

- Staff records are tenant-scoped.
- Staff listing follows the authenticated tenant and branch context.
- Staff creation validates that the target user belongs to the authenticated tenant and is active.
- Explicit branches are validated against the authenticated tenant.
- Branch-context users cannot create staff outside their authenticated branch.
- `(tenant_id, user_id)` uniqueness prevents duplicate staff registration within a tenant.
- Staff creation records the authenticated actor through the `staff.created` audit event.
- Composite tenant-aware foreign keys prevent cross-tenant user and staff associations.

Validation completed:

- 20 test files passed.
- 117 tests passed.
- Typecheck passed.
- Lint passed.
- `git diff --check` passed.

The verified Phase 2A Staff recovery point is `88155c1` after final diff review and remote verification.

### Phase 2B — Provider Management

Provider management is implemented as the second Phase 2 domain slice.

Implemented components:

- `database/migrations/0009_staff_providers.sql`
- `packages/types/src/staff.ts`
- `packages/types/src/permission.ts`
- `packages/db/src/staff.ts`
- `apps/api/src/routes/providers.ts`
- `apps/api/tests/provider-route.test.ts`

API endpoints:

- `GET /api/v1/providers`
- `POST /api/v1/providers`

Security and data-boundary guarantees:

- Providers are tenant-scoped.
- Providers are backed by existing tenant-bound staff members.
- Provider listing follows the authenticated tenant and branch context.
- Provider creation validates the staff-member relationship within the authenticated tenant and branch context.
- Branch-context users cannot create providers outside their authenticated branch.
- `(tenant_id, staff_member_id)` uniqueness prevents duplicate provider registration within a tenant.
- Provider creation records the authenticated actor through the `provider.created` audit event.
- Provider type values are restricted to the centralized supported provider types.
- Tenant-aware database constraints prevent cross-tenant provider/staff associations.

Permissions:

- `provider:read`
- `provider:manage`

Validation completed:

- Provider route tests: 9 tests passed.
- Full test suite: 21 test files passed.
- Full test suite: 126 tests passed.
- Typecheck passed.
- Lint passed.
- `git diff --check` passed.

Phase 2B remains limited to Provider management. Services are implemented separately in Phase 2C; Calendar, Scheduling, and Appointment lifecycle work remain outside the current implementation scope.

### Phase 2C — Service Management

Service Catalog / Service Management is implemented as the third Phase 2 domain slice.

Implemented components:

- `database/migrations/0010_services.sql`
- `packages/types/src/service.ts`
- `packages/types/src/permission.ts`
- `packages/db/src/services.ts`
- `apps/api/src/routes/services.ts`
- `apps/api/tests/service-route.test.ts`

API endpoints:

- `GET /api/v1/services`
- `POST /api/v1/services`

Security and data-boundary guarantees:

- Services are tenant-scoped.
- Services may be branch-scoped.
- Service listing follows the authenticated tenant and branch context.
- Service creation inherits the authenticated branch when no branch is supplied.
- Branch-context users cannot create services outside their authenticated branch.
- Explicit branches are validated against the authenticated tenant.
- `(tenant_id, code)` uniqueness prevents duplicate service registration within a tenant.
- Service duration must be a positive integer.
- Service creation records the authenticated actor through the `service.created` audit event.
- Tenant-aware database constraints prevent cross-tenant branch associations.

Permissions:

- `service:read`
- `service:manage`

Validation completed:

- Service route tests: 10 tests passed.
- Full test suite: 22 test files passed.
- Full test suite: 136 tests passed.
- Typecheck passed.
- Lint passed.
- `git diff --check` passed.

Phase 2C remains limited to Service Catalog / Service Management.

### Phase 2E — Calendar Foundation

Calendar Foundation is implemented as the next Phase 2 domain slice.

Implemented components:

- `database/migrations/0012_calendar_foundation.sql`
- `packages/types/src/calendar.ts`
- `packages/types/src/permission.ts`
- `packages/db/src/calendar.ts`
- `apps/api/src/routes/resources.ts`
- `apps/api/src/routes/availability-rules.ts`
- `apps/api/tests/resource-route.test.ts`
- `apps/api/tests/availability-rules-route.test.ts`

API endpoints:

- `GET /api/v1/resources`
- `POST /api/v1/resources`
- `GET /api/v1/availability-rules`
- `POST /api/v1/availability-rules`

Calendar Foundation guarantees:

- Resources are tenant-scoped.
- Resources may be branch-scoped.
- Resource codes are unique within a tenant.
- Resource types are restricted to `room`, `chair`, `equipment`, and `other`.
- Resource creation inherits the authenticated branch when no branch is supplied.
- Branch-context users cannot create or query resources outside their authenticated branch.
- Availability rules are tenant-scoped.
- Availability rules may be branch-scoped.
- Availability rules must target a provider or resource.
- Provider and resource references are tenant-aware at the database layer.
- Availability rules enforce day-of-week and `HH:mm` time boundaries.
- Resource and availability creation records the authenticated actor through audit events.

Permissions:

- `resource:read`
- `resource:manage`
- `availability:read`
- `availability:manage`

Validation completed:

- Availability route tests: 11 tests passed.
- Resource route tests: 10 tests passed.
- Full test suite: 24 test files passed.
- Full test suite: 157 tests passed.
- Workspace TypeScript typecheck passed.
- Workspace ESLint passed.
- `git diff --check` passed.
- Clean-database migration validation completed successfully through `0012_calendar_foundation.sql`.

Phase 2E is limited to Calendar Foundation. Appointment creation, booking/conflict detection, reschedule/cancel/no-show lifecycle, recurring appointments, waitlist, online booking, and calendar UI remain outside the Phase 2E scope.

### Phase 2F — Scheduling / Appointment Foundation

Appointment Foundation is implemented as the next Phase 2 domain slice.

Implemented components:

- `database/migrations/0013_appointments.sql`
- `packages/types/src/appointment.ts`
- `packages/db/src/appointments.ts`
- `apps/api/src/routes/appointments.ts`
- `apps/api/tests/appointment-route.test.ts`

API endpoints:

- `GET /api/v1/appointments`
- `POST /api/v1/appointments`

Appointment Foundation guarantees:

- Appointments are tenant-scoped.
- Appointments may be branch-scoped.
- Patient, provider, and service references are required and tenant-aware.
- Resource references are optional and tenant-aware.
- Appointment type and status values are constrained.
- Appointment start time must be before end time.
- Branch context is inherited from the authenticated user when not supplied.
- Branch-context users cannot access or create appointments outside their authenticated branch.
- Appointment creation records the authenticated actor through an audit event.
- Appointment listing supports tenant, branch, patient, provider, and resource filtering.
- Cross-tenant appointment references are rejected.

Phase 2F validation:

- Targeted appointment suite: 17 tests passed.
- Full Vitest suite: 25 test files, 174 tests passed.
- Workspace TypeScript typecheck passed.
- Workspace ESLint passed.
- `git diff --check` passed.
- Clean-database migration validation completed successfully through `0013_appointments.sql`.

Phase 2F is limited to Appointment Foundation. Conflict detection, reschedule, cancellation, no-show lifecycle operations, recurring appointments, waitlist, online booking, and calendar UI remain outside the current implementation scope.


## 2026-09-02 — Phase 2H Schedule Availability

- Added `working_hours` with tenant and branch scope, day-of-week, local wall-clock start/end times, and active state.
- Added `schedule_breaks` with tenant and branch scope, day-of-week, local wall-clock start/end times, and active state.
- Added `holidays` with tenant scope and optional branch scope, date, optional name, full-day state, and active state.
- Added GET/POST APIs for working hours, schedule breaks, and holidays.
- Added dedicated read/manage permissions for all three schedule-availability resources.
- Tenant and authenticated branch isolation are enforced.
- Validation covers day-of-week, time format/ranges, and holiday dates.
- Schedule mutations create audit events transactionally.
- Tenant-wide holidays remain visible when listing holidays for a specific branch.
- Out of scope for Phase 2H: slot calculation, conflict detection, booking rules, waitlist, recurring appointments, online booking, notifications, and calendar UI.
- Functional commit: `e1e7df1531c63a8b0355abd1b7b9b249c779fcd5` — `feat(api): implement phase2h schedule availability`.
- Validation completed: Vitest 26 files / 209 tests, workspace TypeScript typecheck, workspace ESLint, and `git diff --check` all passed.
- Fresh PostgreSQL migration execution was not performed because `psql` is not installed in the current environment.
