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
