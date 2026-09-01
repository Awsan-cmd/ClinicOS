# ClinicOS Current State

## Current Stage

Phase 1 — Platform / Identity and Security Foundation.

## Verified Recovery Point

- Latest verified functional commit: `4789bd1` — `fix(api): reuse request context across routing`.
- Latest repository documentation commit: `ca5d32b` — `docs(ai): reconcile project memory with current state`.
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
- Latest commit: `4789bd1`.
- Working tree is clean.
- Latest functional change: API request context is created once per request and reused by the routing layer.
- This prevents duplicate request-context creation and keeps the same authenticated context throughout request processing.
- The previous `af166c9`, `c2f9ee1`, and `ca5d32b` commits remain historical recovery points.

## Latest API Request Context Hardening

- `createRequestContext()` is executed once for each incoming API request.
- The resulting context is passed explicitly into the route handler.
- The route handler no longer creates a second request context.
- This preserves a single request-scoped authentication/context object throughout routing.
- Commit: `4789bd1`.
- Validation:
  - TypeScript typecheck passed.
  - ESLint passed.
  - Vitest: 15 test files passed.
  - Vitest: 86 tests passed.
  - `git diff --check` passed.

## Latest Verified Repository Snapshot

- Verified: 2026-09-01
- Branch: `main`
- HEAD: `66fe637`
- `origin/main`: `66fe637`
- Working tree: clean
- Latest commit: `docs(ai): record patient creation API`
- Patient database migration: `database/migrations/0008_patients.sql`
- Patient DB access: `packages/db/src/patients.ts`
- DB package export: `@clinicos/db/patients`
- API routes:
  - `GET /api/v1/patients`
  - `POST /api/v1/patients`
- Patient listing authorization: requires `patient:read`
- Patient creation authorization: requires `patient:manage`
- Tenant scoping: uses authenticated user's `tenantId`
- Branch scoping: uses authenticated user's `branchId` when present
- Patient creation persists tenant, optional branch, creator identity, demographic/contact fields, and audit event
- Patient medical record number uniqueness: database constraint `UNIQUE (tenant_id, medical_record_number)`
- Duplicate medical record numbers return API `409 conflict`
- Patient creation and audit event are committed transactionally
- Integration coverage: patient authorization and creation route tests
- Validation: `git diff --check` passed
- Validation: workspace TypeScript typecheck passed
- Validation: workspace ESLint passed
- Validation: Vitest passed — 17 test files, 98 tests passed
- Previous patient-access placeholder route was replaced by the real tenant/branch-scoped patient listing and creation routes
- Current architecture remains the Phase 1 authenticated, tenant-aware API foundation


## 2026-09-01 — API Session Logout Lifecycle Hardening

- Added authenticated `POST /api/v1/logout`.
- Logout authenticates through the existing API session-token boundary.
- `AuthenticatedUser` now carries the authenticated `sessionId`.
- Logout revocation is bound simultaneously to `sessionId`, `userId`, and `tenantId`.
- Session revocation only affects an unrevo ked matching session.
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
