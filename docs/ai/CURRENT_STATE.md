# ClinicOS Current State

## Current Stage

Phase 1 — Platform / Identity and Security Foundation.

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
- Current implementation recovery point is pending commit.

- Session touch requires matching tenant, device, and user identity.
- Session touch requires active, non-expired session state.
- Session touch requires current active device access.
- Session touch requires current active device state.
- Active-session validation rechecks current authorization state.
- Cross-tenant session operations remain denied.
- Current implementation recovery point is pending commit.

- Revoking device access immediately revokes matching active device sessions.
- Revoking a device immediately revokes matching active device sessions.
- Device-access revocation is tenant-scoped.
- Device revocation is tenant-scoped.
- Session propagation remains bound to the exact tenant, device, and user relationship.
- Existing revoked sessions are not rewritten unnecessarily.
- Current implementation recovery point is pending commit.

- Device session checks enforce tenant, device, and user identity.
- Revoked and expired sessions are denied.
- Revoked devices are denied.
- Revoked device access is denied.
- Positive authorization is returned only after all security checks pass.
- Current implementation recovery point is pending commit.

- Device sessions are explicitly bound to tenant, device, and user.
- Sessions require active device access and an active device at creation.
- Sessions have explicit lifecycle state and expiration.
- Session touch requires active access, active device state, and non-expired session state.
- Session revocation is tenant-scoped.
- No general-purpose device session update helper is exposed.
- Current implementation recovery point is pending commit.

- Device access is explicitly bound to tenant, device, and user.
- Device access may be branch-scoped.
- Device access supports explicit revocation.
- Active device access is required for access checks.
- No general-purpose device access update helper is exposed.
- Current implementation recovery point is pending commit.

- Devices are explicitly tenant-bound and may be branch-bound.
- Android platform identity includes API level and app version.
- Device capabilities are explicitly represented.
- Device connectivity and heartbeat state are persisted.
- Devices support explicit revocation.
- Heartbeat updates are accepted only for active devices.
- Current implementation recovery point is pending commit.

- Audit events are explicitly tenant-bound.
- Audit events may attribute actions to users and branches.
- Structured audit metadata is stored as JSONB.
- Audit persistence exposes creation only; no update/delete helper is provided.
- Audit retrieval is indexed by tenant and creation time.
- Current implementation recovery point is pending commit.

- Application permissions are represented as strongly typed permission identifiers.
- Initial role-to-permission matrix defined for owner, admin, manager, doctor, receptionist, and nurse.
- Authorization checks deny inactive users.
- Authorization checks deny permissions not assigned to the user's role.
- Authorization context remains explicitly tenant-bound and may include branch context.
- Current implementation recovery point is pending commit.

- Session identity is bound to user and tenant context.
- Session expiration and explicit revocation are supported.
- Raw session tokens are not persisted; only token hashes are stored.
- Transaction-safe database migration `0002_sessions.sql` added.
- Session persistence helpers added to `@clinicos/db`.
- Current implementation recovery point is pending commit.

- User identity and application role types added.
- Authentication request/response contracts added.
- Authenticated users are explicitly bound to `TenantContext`.
- ESM relative imports use explicit `.js` specifiers for NodeNext compatibility.
- Current implementation recovery point is pending commit.

- PostgreSQL client pool and transactional migration runner added.
- `schema_migrations` tracking prevents already-applied migrations from being re-executed.
- Node.js and PostgreSQL TypeScript definitions added for workspace type safety.
- Current implementation recovery point is pending commit.

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
