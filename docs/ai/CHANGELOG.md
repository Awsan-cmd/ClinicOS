
## 2026-08-31 — Device Session Enforcement Hardening

- Hardened device-session tenant and identity validation.
- Session lookup is performed by session identity, followed by explicit tenant/device/user validation.
- Added typed `DeviceSessionAuthorizationError` enforcement.
- Added `requireDeviceSession` for reusable authorization enforcement.
- Added a success-only required-session response contract.
- Verified full test suite: 82 tests passed across 13 test files.
- Verified TypeScript typecheck and ESLint.
- Verified `git diff --check`.
- Latest repository recovery point: `53ab23f`.

## 2026-09-02 — Phase 2C Service Management

Implemented the Phase 2C Service Catalog / Service Management slice.

Added:

- Tenant-bound `services` database table with optional branch scope.
- Service code uniqueness within a tenant.
- Positive service duration enforcement.
- Active/inactive service state with active-by-default behavior.
- Service type contract in `@clinicos/types`.
- `service:read` and `service:manage` permissions.
- `GET /api/v1/services`.
- `POST /api/v1/services`.
- Authenticated tenant and branch-context enforcement.
- Cross-tenant and out-of-branch protection.
- Authenticated actor attribution through the `service.created` audit event.
- Duplicate service-code conflict handling.
- Service API security and validation coverage.

Validation completed:

- Service route tests: 10 tests passed.
- Full test suite: 22 test files passed.
- Full test suite: 136 tests passed.
- Workspace TypeScript typecheck passed.
- Workspace ESLint passed.
- `git diff --check` passed.

Phase 2C remains limited to Service Catalog / Service Management. Calendar, Scheduling, Appointment lifecycle, Provider availability, pricing, billing integration, and service-to-provider scheduling remain outside the current implementation scope.

# ClinicOS Development Changelog

## 2026-09-02 — Phase 2D Patient Management and Migration Chain Repair

Completed the Phase 2D Patient Management slice and repaired the database migration chain discovered during fresh-database validation.

Patient management:

- Tenant-scoped patient records with optional branch scope.
- Medical record number uniqueness within a tenant.
- `GET /api/v1/patients`.
- `POST /api/v1/patients`.
- `patient:read` and `patient:manage` permissions.
- Authenticated tenant and branch-context enforcement.
- Patient creation audit attribution through `patient.created`.
- Validation for required fields and strict `YYYY-MM-DD` dates.
- Duplicate medical record number conflict handling.

Migration integrity:

- Removed the duplicate/incomplete `devices` table definition from `0001_initial_tenancy.sql`.
- Kept `0004_devices.sql` as the canonical full device schema migration.
- Updated the Phase 1 migration test to verify the device table in `0004_devices.sql`.
- Added `0011_patients_tenant_branch_fk.sql` to enforce tenant-aware patient branch foreign-key integrity.
- Verified the complete migration chain on a clean PostgreSQL 17.11 database.

Validation completed:

- Full test suite: 22 test files passed.
- Full test suite: 136 tests passed.
- Workspace TypeScript typecheck passed.
- Workspace ESLint passed.
- `git diff --check` passed.


This file records the historical and ongoing implementation progress of ClinicOS.

## 2026-08-30 — Master Specification Baseline

Created the Master Specification baseline; defined product, technical, AI/omnichannel, security, QA, roadmap, implementation phases, memory system, and GitHub/Termux verification workflow.

Repository was pre-implementation.

---

## 2026-08-30 — Repository Foundation

Started Sprint 0 repository foundation.

Created the initial monorepo structure with:

- npm workspaces
- root TypeScript configuration
- repository ignore/npm configuration
- six workspace package manifests
- package-lock.json

Validated:

- JSON structure
- workspace entries in the lockfile
- Git whitespace integrity
- absence of secrets in new files
- absence of node_modules

Repository foundation remained in progress.

---

## 2026-08-31 — Tooling and Test Foundation

Installed and verified the TypeScript, ESLint, and Vitest development toolchain on the Linux development environment.

Added:

- ESLint flat configuration
- root Vitest smoke test

Updated the root test script so `npm test` executes Vitest directly.

Validated:

- typecheck
- lint
- smoke test
- Git whitespace integrity
- npm audit with zero vulnerabilities

---

## 2026-08-31 — Android Telephony and Realtime Voice Architecture

Updated the ClinicOS architecture and implementation plan to reserve first-class support for a future integrated Android application.

The Android application will be capable, where supported by the device and Android version, of acting as a ClinicOS client, Android Telephony Gateway, SMS Gateway, and Realtime Voice Gateway.

The architecture explicitly targets broad Android compatibility, including Android 5.x where technically feasible, Android 6.x–8.x, and modern Android.

Added requirements for:

- device identity
- capability detection
- permission state
- telephony/SMS events
- realtime voice sessions
- secure bidirectional audio transport
- offline handling
- device health
- revocation
- observability
- compatibility testing

The Android implementation remains intentionally deferred to the later Channels/Voice phases while backend contracts and architecture are established from the beginning.

---

## 2026-08-31 — Repository Foundation Commit

Commit: `6f0a2ba`

Established the initial repository foundation:

- npm workspaces
- root TypeScript configuration
- ESLint configuration
- Vitest test foundation
- root smoke test

Validation:

- typecheck passed
- lint passed
- tests passed

---

## 2026-08-31 — Documentation Correction

Commit: `bd57615`

Corrected and synchronized repository-state documentation.

Updated:

- `docs/IMPLEMENTATION_PLAN.md`
- `docs/TECHNICAL_SPECIFICATION.md`
- `docs/ai/CURRENT_STATE.md`

Validation:

- Git diff check passed
- working tree clean
- local and remote `main` matched

---

## 2026-08-31 — Phase 0 Infrastructure Foundation

Commit: `2727592`

Added:

- `.env.example`
- Docker Compose configuration
- PostgreSQL development service
- Redis development service
- infrastructure health checks
- Vitest configuration
- Phase 0 configuration test
- GitHub Actions CI workflow

A configuration warning was encountered with `vitest.config.ts` and resolved by using `vitest.config.mts`.

Validation:

- typecheck passed
- lint passed
- tests passed
- Git diff check passed
- working tree clean
- local and remote `main` matched

---

## 2026-08-31 — Phase 1 Tenancy Foundation

Commit: `d8da109`

Added:

- tenant identifier types
- branch identifier types
- user identifier types
- device identifier types
- explicit `TenantContext`
- environment configuration loader
- initial tenancy database migration
- tenant ownership constraints
- workspace package linking
- Phase 1 foundation tests

Core database entities:

- tenants
- branches
- users
- devices

Validation:

- npm workspace linking passed
- typecheck passed
- lint passed
- tests passed
- Git diff check passed
- working tree clean
- local and remote `main` matched

---

## 2026-08-31 — Continuous Documentation Policy

Established a mandatory documentation and recovery-point policy for ClinicOS.

The policy exists specifically to protect project continuity against:

- unexpected power loss
- internet interruption
- system shutdown
- terminal/session loss
- development environment failure

Every significant completed task must produce a recoverable repository state.

Required sequence:

1. Implement
2. Validate
3. Update documentation
4. Review staged diff
5. Commit
6. Push
7. Verify local/remote synchronization
8. Confirm clean working tree

A task is not considered complete until the implementation, tests, documentation, commit, and remote synchronization have all been verified.

---

## Documentation Responsibilities

### `docs/IMPLEMENTATION_PLAN.md`

Defines what will be built and the implementation phases.

### `docs/TECHNICAL_SPECIFICATION.md`

Defines how the system is architected and the technical rules governing implementation.

### `docs/INTEGRATIONS.md`

Defines external integrations and Android, telephony, SMS, realtime, and related integration architecture.

### `docs/ai/CURRENT_STATE.md`

Defines the verified current repository state and what has actually been completed.

### `docs/ai/DECISIONS.md`

Records important architecture and implementation decisions together with their rationale.

### `docs/ai/CHANGELOG.md`

Records the chronological implementation history, validation results, commits, and important workflow decisions.

---

## Documentation Policy

Documentation is part of the implementation, not a post-development activity.

Every significant implementation step must update the appropriate documentation before its commit is finalized.

No major implementation work should begin from an uncommitted and undocumented state when the preceding task is expected to be complete.
---

## 2026-08-31 — Phase 1A Database Foundation

Added the first dedicated database infrastructure layer.

Added:

- `@clinicos/db` workspace
- PostgreSQL connection pool factory
- migration loader
- transactional migration runner
- `schema_migrations` tracking
- Phase 1A database tests
- `@types/node`
- `@types/pg`

The migration runner:

1. ensures the migration tracking table exists
2. loads migrations in deterministic filename order
3. skips already-applied migrations
4. executes new migrations transactionally
5. records successful migrations
6. rolls back failed migrations

Initial tenancy migration remains the first database migration.

Validation:

- npm install passed
- PostgreSQL package linked successfully
- typecheck passed
- lint passed
- 7 tests passed
- Git diff check passed

The task is ready for commit and remote recovery-point verification.
---

## 2026-08-31 — Phase 1B Identity Foundation

Added the initial application identity and authentication contract layer.

Added:

- `UserIdentity`
- `UserRole`
- `AuthenticatedUser`
- `LoginRequest`
- `LoginResponse`
- identity package exports
- authentication contract exports
- Phase 1 identity tests

Defined initial roles:

- owner
- admin
- manager
- doctor
- receptionist
- nurse

Identity is explicitly associated with tenant context.

During validation, NodeNext ESM compilation reported missing relative import extensions. The affected imports were corrected to explicit `.js` specifiers.

Validation after correction:

- typecheck passed
- lint passed
- 10 tests passed
- Git diff check passed

The task is ready for commit and remote recovery-point verification.
---

## 2026-08-31 — Phase 1C Session Foundation

Added the initial authenticated-session persistence layer.

Added:

- `SessionId`
- `UserSession`
- session creation contract
- session response contract
- session revocation contract
- `sessions` database table
- session indexes
- token-hash persistence
- expiration tracking
- explicit revocation tracking
- session persistence helpers
- Phase 1 session tests

Security properties:

- sessions are bound to users and tenants
- raw session tokens are not stored
- sessions can be explicitly revoked
- expired sessions can be indexed and evaluated efficiently

Validation:

- typecheck passed
- lint passed
- 14 tests passed
- Git diff check passed

The task is ready for commit and remote recovery-point verification.
---

## 2026-08-31 — Phase 1D RBAC Foundation

Added the initial role-based authorization layer.

Added:

- `Permission`
- centralized `ROLE_PERMISSIONS`
- `AuthorizationContext`
- `AuthorizationResult`
- `hasPermission`
- `authorize`
- `@clinicos/auth` workspace
- RBAC tests

Initial roles:

- owner
- admin
- manager
- doctor
- receptionist
- nurse

Authorization properties:

- permissions are strongly typed
- role permissions are centralized
- inactive users are denied
- missing permissions are denied
- tenant context remains part of authorization context

Validation:

- typecheck passed
- lint passed
- 20 tests passed
- Git diff check passed

The task is ready for commit and remote recovery-point verification.
---

## 2026-08-31 — Phase 1E Audit Foundation

Added the initial audit-event foundation.

Added:

- `AuditEventId`
- `AuditAction`
- `AuditResource`
- `AuditEvent`
- audit creation contract
- audit response contract
- `audit_events` database table
- tenant, user, branch, resource and creation-time indexes
- structured JSONB metadata
- audit persistence helper
- Phase 1 audit tests

Security properties:

- every audit event is tenant-bound
- user and branch attribution are supported
- structured metadata is retained
- persistence exposes creation only
- no application update/delete helper exists for audit events

Validation:

- typecheck passed
- lint passed
- 26 tests passed
- Git diff check passed

The task is ready for staging and commit.
---

## 2026-08-31 — Phase 1F Device Identity and Capability Foundation

Added the initial ClinicOS device identity layer.

Added:

- `DeviceId`
- `DeviceStatus`
- `DeviceCapability`
- `DeviceConnectivity`
- `ClinicDevice`
- device enrollment contract
- device revocation contract
- device heartbeat contract
- `devices` database table
- tenant and branch binding
- Android API level tracking
- app version tracking
- capability state
- connectivity state
- heartbeat tracking
- explicit device revocation
- device persistence helpers
- Phase 1F device tests

Security properties:

- devices have independent identities
- every device is tenant-bound
- branch binding is explicit and optional
- revoked devices cannot receive heartbeat updates
- device capabilities are represented explicitly
- device lifecycle state is persisted

Validation:

- typecheck passed
- lint passed
- 33 tests passed
- Git diff check passed

The task is ready for staging and commit.
---

## 2026-08-31 — Phase 1G Device Access Foundation

Added the initial secure device-access relationship layer.

Added:

- `DeviceAccessId`
- `DeviceAccessStatus`
- `DeviceAccess`
- device access grant contract
- device access revocation contract
- `device_access` database table
- tenant/device/user binding
- optional branch scoping
- explicit access revocation
- active-access verification helper
- tenant/device and tenant/user lookup indexes
- Phase 1G device access tests

Security properties:

- device access is tenant-bound
- access is explicitly tied to a device and user
- branch scope is explicit when required
- revoked access is excluded from active-access checks
- historical access records are retained
- no general-purpose update helper is exposed

Validation:

- typecheck passed
- lint passed
- 40 tests passed
- Git diff check passed

The task is ready for staging and commit.
---

## 2026-08-31 — Phase 1H Device Session Foundation

Added the initial device-session lifecycle layer.

Added:

- `DeviceSessionId`
- `DeviceSessionStatus`
- `DeviceSession`
- device session creation contract
- device session revocation contract
- device session touch contract
- `device_sessions` database table
- tenant/device/user binding
- explicit session expiration
- last-seen tracking
- active-session verification
- explicit session revocation
- tenant/device and tenant/user lookup indexes
- Phase 1H device session tests

Security properties:

- sessions are tenant-bound
- sessions are tied to a specific device and user
- session creation requires active device access
- session creation requires an active device
- expired sessions are rejected
- revoked sessions cannot be touched
- revoked device access prevents session activity
- revoked devices prevent session activity
- session revocation is tenant-scoped
- no general-purpose update helper is exposed

Validation:

- typecheck passed
- lint passed
- 49 tests passed
- Git diff check passed

The task is ready for staging and commit.
---

## 2026-08-31 — Phase 1I Device Session Enforcement Foundation

Added the centralized device-session authorization guard.

Added:

- `DeviceSessionGuardResult`
- device-session guard request/response contracts
- `checkDeviceSession`
- tenant isolation enforcement
- device identity enforcement
- user identity enforcement
- session lifecycle enforcement
- session expiration enforcement
- device lifecycle enforcement
- active device-access enforcement
- explicit denial reasons
- Phase 1I enforcement tests

Security properties:

- session identity is checked first
- tenant identity must match
- device identity must match
- user identity must match
- revoked sessions are denied
- expired sessions are denied
- revoked devices are denied
- revoked device access is denied
- device and access joins remain tenant-scoped
- authorization succeeds only after every required check passes

Validation:

- typecheck passed
- lint passed
- 58 tests passed
- Git diff check passed

The task is ready for staging and commit.
---

## 2026-08-31 — Phase 1J Device Session Revocation Propagation

Added immediate session invalidation when device authorization is revoked.

Added:

- device-access revocation propagation to active sessions
- device revocation propagation to active sessions
- tenant-scoped device-access revocation
- tenant-scoped device revocation
- exact tenant/device/user matching for access revocation
- exact tenant/device matching for device revocation
- Phase 1J propagation and tenant-isolation tests

Security properties:

- revoking device access immediately revokes matching active sessions
- revoking a device immediately revokes matching active sessions
- cross-tenant device-access revocation is prevented
- cross-tenant device revocation is prevented
- unrelated users' sessions are not revoked by access revocation
- unrelated devices' sessions are not revoked by device revocation
- already-revoked sessions are not unnecessarily modified
- propagated sessions receive an explicit `revoked_at` timestamp

Validation:

- typecheck passed
- lint passed
- 66 tests passed
- Git diff check passed

The task is ready for staging and commit.
---

## 2026-08-31 — Phase 1K Device Session Lifecycle Hardening

Hardened device-session lifecycle validation.

Added test coverage ensuring:

- session touch is tenant-scoped
- session touch is device-scoped
- session touch is user-scoped
- revoked sessions cannot be touched
- expired sessions cannot be touched
- revoked device access prevents session touch
- revoked devices prevent session touch
- active-session validation rechecks current authorization state

Validation:

- typecheck passed
- lint passed
- 73 tests passed
- Git diff check passed

The implementation is ready for staging and commit.
---

## 2026-08-31 — Phase 1L Device Session Creation Hardening

Hardened device-session creation.

Added:

- database-level rejection of already-expired session creation
- `RETURNING id` to detect actual insertion
- boolean creation result for callers
- regression tests for expired-session rejection
- regression tests for creation outcome reporting

Validation:

- typecheck passed
- lint passed
- 76 tests passed
- Git diff check passed

The implementation is ready for staging and commit.


---

## 2026-09-01 — API Session Authentication and Me Endpoint

Commit: `af166c9`

Implemented the first API authentication boundary.

Added:

- Bearer session-token extraction.
- SHA-256 session-token hashing.
- Active session lookup.
- Tenant-bound user identity lookup.
- Authenticated request context.
- `GET /api/v1/me`.
- API authentication tests.
- API database pool integration.
- Graceful API database-pool shutdown.

Validation recorded:

- TypeScript typecheck passed.
- ESLint passed.
- Vitest: 15 test files passed.
- Vitest: 86 tests passed.
- `git diff --check` passed.

---

## 2026-09-01 — Linux Terminal Development Workflow

Commit: `c2f9ee1`

Replaced the old Termux-oriented development-environment documentation with the canonical Linux Terminal workflow.

The development workstation is Linux + standard Terminal + Bash-compatible shell.

Android remains a future ClinicOS client/platform target and is not the development environment.

Validation:

- Working tree clean.
- Local `HEAD` matched `origin/main`.
- Commit pushed to GitHub.

---

## 2026-09-01 — API Request Context Reuse

Commit: `4789bd1`

Hardened the API request lifecycle by ensuring that the request context is created once and passed through the routing layer.

Changed:

- `apps/api/src/app.ts`
- Removed duplicate `createRequestContext()` execution from the route handler.
- Passed the existing request context explicitly into `route()`.

Reason:

The request context represents request-scoped authentication and identity information. Creating it more than once could cause future authentication/authorization state to diverge during the same request.

Validation:

- TypeScript typecheck passed.
- ESLint passed.
- Vitest: 15 test files passed.
- Vitest: 86 tests passed.
- `git diff --check` passed.
- Working tree clean after commit.
- Local `HEAD` matched `origin/main`.


---

## 2026-09-01 — Patient Creation API

Commit: `06b528e`

Implemented authenticated patient creation with tenant-scoped authorization.

Added:

- `POST /api/v1/patients`
- `patient:manage` authorization boundary
- Tenant scoping from authenticated request context
- Optional branch scoping from authenticated request context
- Patient input validation
- ISO `YYYY-MM-DD` date-of-birth validation
- Tenant-scoped medical record number uniqueness handling
- `409 conflict` response for duplicate medical record numbers
- Transactional patient creation
- `patient.created` audit event
- Integration tests covering authorization and patient creation

Database constraint verified:

- `UNIQUE (tenant_id, medical_record_number)` in `database/migrations/0008_patients.sql`

Validation:

- typecheck passed
- lint passed
- 98 tests passed
- Git diff check passed

Commit pushed to `origin/main`.


## 2026-09-01 — API Logout and Session Revocation Hardening

Implemented the authenticated API logout lifecycle.

Added:

- `POST /api/v1/logout`
- authenticated session identity propagation through `AuthenticatedUser.sessionId`
- tenant/user/session-bound authenticated session revocation
- successful logout audit event
- regression coverage for authentication requirement
- regression coverage for successful session revocation
- regression coverage proving a logged-out token cannot authenticate again
- regression coverage for failed revocation
- Phase 1 authenticated-session security regression tests

Security review:

- Logout cannot revoke a session belonging to another user.
- Logout cannot revoke a session belonging to another tenant.
- Already-revoked sessions are not treated as successful revocations.
- Expired or revoked sessions remain outside the active-session authentication path.
- Raw session tokens remain unpersisted; authentication continues to use token hashes.
- Logout attribution is written to the tenant-bound audit stream.

Validation:

- `git diff --check` passed.
- Workspace TypeScript typecheck passed.
- Workspace ESLint passed.
- Vitest: 19 test files passed.
- Vitest: 107 tests passed.

The implementation is ready for a versioned repository recovery point.


## 2026-09-02 — Phase 2A Staff

Implemented the first Phase 2 domain slice: Staff management.

### Implementation

- Added Staff domain types in `packages/types/src/staff.ts`.
- Added tenant- and branch-scoped Staff persistence in `packages/db/src/staff.ts`.
- Added Staff API endpoints:
  - `GET /api/v1/staff`
  - `POST /api/v1/staff`
- Added `staff:read` and `staff:manage` permissions.
- Added validation that Staff users belong to the authenticated tenant and are active.
- Added tenant validation for Staff branches.
- Added authenticated branch-context enforcement.
- Added composite tenant-aware foreign keys.
- Added per-tenant Staff uniqueness through `(tenant_id, user_id)`.
- Added `staff.created` audit events using the authenticated actor.
- Added Staff security-boundary tests.

### Validation

- 20 test files passed.
- 117 tests passed.
- Typecheck passed.
- Lint passed.
- `git diff --check` passed.

Providers and Calendar remain outside the scope of this change and have not been started.

---

## 2026-09-02 — Phase 2B Provider Management

Implemented the Phase 2B Provider foundation and API.

Added:

- tenant-bound provider records backed by staff members
- provider listing with tenant and authenticated branch scoping
- provider creation with authenticated actor attribution
- `provider:read` and `provider:manage` permissions
- provider type validation
- tenant-aware staff/provider relationship enforcement
- duplicate provider registration protection
- `provider.created` audit events
- API security and validation tests

Verified:

- Provider route tests: 9 tests passed
- Full test suite: 126 tests passed across 21 test files
- TypeScript typecheck passed
- ESLint passed
- `git diff --check` passed

Phase 2B remains limited to Provider management. Services, Calendar, Scheduling, and Appointment lifecycle work remain outside this phase.

Current verified recovery point will be established after the final Phase 2B documentation, diff review, commit, push, and remote verification.

## 2026-09-03 — Phase 2L Availability Slot Calculation

Implemented the Availability Slot Calculation slice.

Added:

- database-backed availability slot calculation
- tenant and branch-scoped availability evaluation
- provider branch validation through the provider's staff-member branch
- active service and branch-scope validation
- working-hours slot generation
- schedule-break exclusion
- full-day holiday exclusion
- booking-rule selection by matching scope specificity
- `minimum_notice_minutes` enforcement
- `advance_booking_days` enforcement
- provider conflict exclusion for scheduled and confirmed appointments
- optional resource validation and conflict exclusion
- `GET /api/v1/availability`
- `availability:read` authorization
- authenticated branch-context enforcement
- availability input and date-range validation
- API regression coverage for authentication, authorization, input validation, and branch boundaries

PostgreSQL verification:

- Direct PostgreSQL verification confirmed that `minimum_notice_minutes` and `advance_booking_days` affect returned availability.
- The verification database did not contain the multi-branch resource fixtures required for an end-to-end provider/resource cross-branch integration test, so that scenario is not claimed as integration-verified.

Validation:

- Availability route tests: 7 passed.
- Full Vitest suite: 29 test files / 238 tests passed.
- Workspace TypeScript typecheck passed.
- Workspace ESLint passed.
- `git diff --check` passed.

Phase 2L implementation, validation, commit, push, and repository recovery-point creation are complete; recovery point: `f6f708d7ed66e4d43065fa4ddaecadc41729c051`.
