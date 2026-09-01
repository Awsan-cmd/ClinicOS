# ClinicOS Architecture Decisions

This file records important architectural and implementation decisions.

## Decision 001 — Monorepo Structure

ClinicOS uses an npm workspace monorepo with separate applications and shared packages.

Current workspaces:

- `apps/api`
- `apps/web`
- `apps/worker`
- `packages/config`
- `packages/contracts`
- `packages/types`

Reason:

Keep application boundaries explicit while allowing shared contracts, types, and configuration to evolve centrally.

---

## Decision 002 — Multi-Tenant Foundation

Tenant identity is a first-class architectural concern.

Core entities include:

- tenants
- branches
- users
- devices

Core records that belong to a tenant carry `tenant_id`.

Reason:

Tenant isolation must be enforced from the database and application layers rather than added later.

---

## Decision 003 — Explicit Tenant Context

The application uses an explicit `TenantContext` containing:

- `tenantId`
- optional `branchId`

Reason:

Tenant and branch authorization must be resolved explicitly for requests, jobs, devices, and future realtime operations.

---

## Decision 004 — Branded TypeScript Identifiers

Tenant, branch, user, and device identifiers use branded TypeScript string types.

Reason:

Prevent accidental interchange of semantically different identifiers during application development.

---

## Decision 005 — Vitest Configuration

Vitest uses `vitest.config.mts`.

Reason:

The project uses ESM-compatible TypeScript configuration. The `.mts` extension avoids the configuration warning encountered with `vitest.config.ts` under the current module setup.

---

## Decision 006 — Infrastructure Foundation

Development infrastructure is defined through Docker Compose with:

- PostgreSQL
- Redis
- persistent volumes
- health checks

Environment defaults are documented in `.env.example`.

Reason:

Local infrastructure must be reproducible and aligned with the planned production architecture.

---

## Decision 007 — CI Foundation

GitHub Actions validates:

- dependency installation
- typecheck
- lint
- tests
- git diff integrity

Reason:

Every change should pass the same baseline validation before being accepted into `main`.
---

## Decision 008 — Dedicated Database Workspace

ClinicOS uses a dedicated `@clinicos/db` workspace for PostgreSQL access and migration execution.

Reason:

Database connectivity and migration mechanics should have a clear boundary rather than being embedded directly inside the API application.

---

## Decision 009 — Transactional Migration Runner

Database migrations are tracked in a `schema_migrations` table and each new migration is executed inside an explicit transaction.

Reason:

A migration must either complete fully or roll back without leaving a partially-applied schema state.

Already-recorded migration identifiers are skipped.

---

## Decision 010 — Node/PostgreSQL Type Definitions

The repository explicitly installs `@types/node` and `@types/pg`.

Reason:

The database and configuration packages use Node.js APIs and PostgreSQL types and therefore require explicit compile-time definitions under the project's strict TypeScript configuration.
---

## Decision 011 — Identity Bound to Tenant Context

Authenticated users carry both `UserIdentity` and `TenantContext`.

Reason:

Authentication must not establish identity independently from tenant and branch authorization context.

---

## Decision 012 — Explicit Application Roles

ClinicOS defines explicit application roles:

- owner
- admin
- manager
- doctor
- receptionist
- nurse

Reason:

Roles form the initial authorization vocabulary and provide a stable foundation for later permission policies.

---

## Decision 013 — ESM Explicit Relative Import Extensions

Relative TypeScript imports use `.js` extensions where required by the NodeNext/Node16 module-resolution model.

Reason:

The repository uses ESM-compatible TypeScript configuration, where runtime-relative imports must resolve with explicit extensions.
---

## Decision 014 — Tenant-Bound Sessions

ClinicOS sessions explicitly store both `user_id` and `tenant_id`.

Reason:

Authentication state must remain associated with the tenant security boundary and must not rely solely on the user relationship.

---

## Decision 015 — Hashed Session Tokens

ClinicOS persists only a hash of the session token.

Reason:

A database compromise must not directly expose usable session credentials.

---

## Decision 016 — Explicit Session Revocation

Sessions support explicit revocation through `revoked_at`.

Reason:

Security-sensitive sessions must be invalidatable before their natural expiration, including logout, account deactivation, device revocation, or incident response.
---

## Decision 017 — Explicit Permission Vocabulary

ClinicOS authorization uses explicit typed permission identifiers such as `patient:read`, `patient:manage`, and `clinical:manage`.

Reason:

A stable permission vocabulary provides a predictable authorization boundary and avoids scattering ad-hoc role checks throughout application code.

---

## Decision 018 — Role-to-Permission Matrix

ClinicOS uses a centralized role-to-permission matrix for the initial application roles.

Reason:

Authorization policy should be centralized and reviewable rather than duplicated across individual features.

---

## Decision 019 — Inactive Users Are Always Denied

Authorization rejects inactive users before evaluating role permissions.

Reason:

Account activation state is a security boundary and must not be bypassed by an otherwise valid role assignment.
---

## Decision 020 — Tenant-Bound Audit Events

ClinicOS audit events must contain a mandatory `tenant_id`.

Reason:

Audit history is part of the tenant security boundary and must never be treated as a global unscoped event stream.

---

## Decision 021 — Structured Audit Metadata

ClinicOS audit events support structured metadata stored as JSONB.

Reason:

Security and operational events may require contextual information without repeatedly changing the audit schema for every feature.

---

## Decision 022 — Append-Only Audit Persistence API

The initial audit persistence layer exposes event creation but no update or delete helper.

Reason:

Audit history should be treated as an append-only record of security and application activity.
---

## Decision 023 — Independently Identified Clinic Devices

ClinicOS devices have their own `DeviceId` and lifecycle state rather than relying only on tenant identity.

Reason:

A device is a security principal and must be independently identifiable and revocable.

---

## Decision 024 — Explicit Device Capability Model

ClinicOS represents device capabilities explicitly, including telephony, SMS, microphone, audio, realtime, notifications, and background execution.

Reason:

Android capabilities vary by OS version, device, OEM, permissions, and runtime state. The platform must not assume that every enrolled device supports every capability.

---

## Decision 025 — Active-Only Device Heartbeats

Device heartbeat updates are applied only to devices whose status is `active`.

Reason:

A revoked device must not be able to refresh operational state or appear healthy after revocation.
---

## Decision 026 — Device Access Is a Separate Security Relationship

ClinicOS represents device access as an explicit relationship between tenant, device, and user.

Reason:

Device identity and user identity are separate security principals. Explicit access records make grants and revocations auditable and independently enforceable.

---

## Decision 027 — Device Access May Be Branch-Scoped

Device access may optionally include a branch context.

Reason:

A clinic may restrict a user's device access to a particular branch while preserving tenant-level ownership.

---

## Decision 028 — Revoked Device Access Is Not Active

Device access checks consider only records with `status = 'active'`.

Reason:

Revocation must immediately remove the access relationship without deleting historical attribution.
---

## Decision 029 — Device Sessions Require Active Access

A device session may be created only when the tenant/device/user relationship has active device access and the device itself is active.

Reason:

Authentication state must not outlive the authorization relationship or the enrolled device lifecycle.

---

## Decision 030 — Device Sessions Expire Explicitly

Device sessions contain an explicit `expires_at` and active-session checks require the expiration time to be in the future.

Reason:

Device authentication must have a bounded lifetime and must not depend solely on explicit revocation.

---

## Decision 031 — Session Activity Requires Current Authorization

Updating `last_seen_at` requires the session, device access relationship, and device to all remain active.

Reason:

A revoked device or revoked access relationship must immediately prevent continued session activity.

---

## Decision 032 — Session Revocation Is Tenant-Scoped

Device session revocation requires both the session identity and tenant identity.

Reason:

Tenant isolation must apply to lifecycle mutations as well as session reads and activity checks.
---

## Decision 033 — Device Session Enforcement Is Centralized

Device session authorization is evaluated through a dedicated guard that validates session, tenant, device, user, device lifecycle, and device-access state.

Reason:

Security-critical session checks should have one explicit enforcement boundary rather than being duplicated across callers.

---

## Decision 034 — Tenant, Device, and User Identity Must Match

A device session is allowed only when the supplied tenant, device, and user identities exactly match the persisted session relationship.

Reason:

Authentication state must never be usable across tenants or by a different device or user.

---

## Decision 035 — Authorization Requires Current Device State

A session is denied when its device is no longer active or its device-access relationship is no longer active.

Reason:

Session validity depends on the current authorization and enrollment state, not only on the original session creation state.

---

## Decision 036 — Expired Sessions Are Denied at Enforcement Time

Session authorization checks compare `expires_at` against the current time and deny expired sessions.

Reason:

Expiration must be enforced at the authorization boundary even if an explicit lifecycle transition has not yet marked the record as expired.
---

## Decision 037 — Authorization Revocation Propagates Immediately

Revoking device access immediately revokes all currently active sessions for the exact tenant, device, and user relationship.

Reason:

Removing authorization must invalidate authentication state without waiting for a later session check.

---

## Decision 038 — Device Revocation Propagates to Active Sessions

Revoking a device immediately revokes all currently active sessions associated with that device within the same tenant.

Reason:

A revoked device must not retain usable authentication sessions.

---

## Decision 039 — Revocation Mutations Are Tenant-Scoped

Device and device-access revocation require both the resource identity and tenant identity.

Reason:

Lifecycle mutations must preserve tenant isolation and prevent cross-tenant authorization changes.

---

## Decision 040 — Revocation Propagation Targets Active Sessions Only

Propagation updates only sessions whose status is currently `active`.

Reason:

Historical revoked sessions should remain historical records and should not receive unnecessary lifecycle mutations.
---

## Decision 041 — Session Touch Revalidates Current Authorization

A device session may be touched only when the session is active and non-expired and the associated device and device-access relationship are currently active.

Reason:

A valid session must not become a mechanism for retaining authorization after its underlying device authorization has been revoked.

---

## Decision 042 — Session Lifecycle Operations Remain Tenant and Identity Scoped

Session lifecycle operations require matching tenant, device, and user identity.

Reason:

Session identifiers alone must never permit cross-tenant or cross-identity session manipulation.
---

## Decision 043 — Device Sessions Must Have a Future Expiry

Device-session creation rejects an expiration timestamp that is not strictly later than the current database time.

Reason:

A session must never be created already expired. Enforcing this at the database query boundary prevents callers from accidentally persisting unusable sessions.

---

## Decision 044 — Session Creation Reports Persistence Outcome

Device-session creation returns whether a row was actually inserted.

Reason:

Authorization conditions may prevent insertion. Callers must be able to distinguish successful session creation from a rejected creation without assuming that the INSERT always produced a row.

## Device Session Authorization Boundary

Device-session authorization must not trust tenant, device, or user identifiers supplied alongside a session identifier. The session is resolved first by its own identity, then its persisted tenant/device/user binding is compared explicitly with the request context. Current device state and current device-access state are also revalidated before authorization succeeds.

A reusable `requireDeviceSession` helper converts denied authorization results into a typed `DeviceSessionAuthorizationError`, allowing application boundaries to enforce the same security policy consistently.


## Decision 045 — Authenticated Logout Is Session-Bound

ClinicOS logout must revoke the exact authenticated session represented by the bearer token.

The revocation operation is bound to:

- session identity
- authenticated user identity
- authenticated tenant identity

Reason:

A logout endpoint must not accept arbitrary session identifiers or allow a valid authenticated principal to revoke another user's or another tenant's session. Binding the mutation to the complete authenticated relationship preserves tenant isolation and identity integrity.

---

## Decision 046 — Logout Must Invalidate Authentication Immediately

A successfully logged-out session must become unusable for subsequent API authentication.

Reason:

Logout is an authentication-state transition, not merely an informational API action. The active-session lookup therefore excludes revoked sessions, ensuring the same bearer token cannot continue accessing protected API routes.

---

## Decision 047 — Logout Is Audited

Successful logout is recorded as a tenant-bound audit event attributed to the authenticated user and session.

Reason:

Authentication lifecycle events are security-relevant operational events. Recording the tenant, user, session, and request/correlation context provides traceability without exposing the raw bearer token.

---

## Decision 048 — Authentication Boundary and Fail-Closed Authorization

ClinicOS requires protected API routes to pass through a shared authentication boundary.

The authentication boundary rejects requests when:
- no valid active session is available;
- the authenticated user is inactive.

Authorization must fail closed when runtime role data is not mapped in the centralized role-to-permission matrix.

An unmapped role therefore receives no permissions and results in authorization denial rather than an internal server error.

Reason:

Authentication and authorization are security boundaries. Protected routes should not duplicate authentication logic, inactive users must not reach authenticated handlers, and malformed or unexpected runtime role data must never accidentally bypass authorization or produce an unsafe permissive result.


### 049 — Staff records are tenant-bound

Staff records must carry `tenant_id`, and staff users must be validated against the authenticated tenant before creation. Database enforcement uses the composite `(tenant_id, user_id)` relationship to prevent cross-tenant associations.

### 050 — Staff branch scope follows authenticated branch context

Staff listing is filtered by the authenticated tenant and branch context. Staff creation inherits the authenticated branch when no branch is supplied and rejects an explicitly supplied branch outside that authenticated branch context.

### 051 — Staff registration is unique per tenant

A user can have at most one staff membership within a tenant. This is enforced by `UNIQUE (tenant_id, user_id)` at the database layer, with duplicate registration exposed by the API as `409 Conflict`.

### 052 — Providers are staff-backed clinical records

Providers are modeled as clinical records linked to an existing staff member rather than as independent user records.

Provider registration therefore requires an existing tenant-bound staff member and preserves the staff-to-user relationship already established by the Staff foundation.

### 053 — Provider registration is unique per staff member

A staff member may be registered as a provider at most once within a tenant.

The database enforces this invariant with a tenant-aware unique constraint on `(tenant_id, staff_member_id)`, while the API returns a conflict response for duplicate registration attempts.

### 054 — Provider branch scope follows staff branch scope

Provider branch visibility and creation scope are inherited from the associated staff member and the authenticated branch context.

Provider operations must not allow a provider to be created or listed outside the authenticated tenant or branch boundary.
