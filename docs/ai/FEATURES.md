# Features

## COMPLETED
- Master specification, technical/product/UX/security/QA docs.
- Persistent memory workflow.
- Initial monorepo repository foundation.
- npm workspaces.
- Root TypeScript configuration.
- Repository ignore and npm configuration.
- Application/package manifests.
- npm lockfile foundation.
- Development tooling foundation:
  - TypeScript
  - ESLint
  - Vitest
  - ESLint flat configuration
  - Root smoke test
  - Verified typecheck, lint, and test execution.

## IN PROGRESS
Phase 1 — Platform / Identity and Security Foundation:
- API authentication boundary hardening.
- Authentication lifecycle completion.
- Authorization enforcement at API boundaries.
- Session/logout lifecycle integration.
- Security regression coverage.

Repository/Infrastructure foundation is implemented and validated.

## PLANNED
Clinic/branches, patients, scheduling, clinical, dental, billing, CRM, inbox, notifications, automation, AI agents, voice, portal, analytics, SaaS billing, production infrastructure.

Authentication, sessions, RBAC, audit, device identity, device access, device sessions, and API `/me` identity are no longer merely planned; their implemented foundations are recorded under COMPLETED.

## BLOCKED
None.

A feature becomes COMPLETED only after implementation, testing, review, and verification.

## ANDROID / TELEPHONY ARCHITECTURE

Planned from the beginning:

- First-party ClinicOS Android application.
- Broad Android compatibility strategy.
- Android 5–8 compatibility target where technically feasible.
- Modern Android support.
- Device registration and authentication.
- Permission/capability reporting.
- Incoming calls.
- Outgoing calls.
- SMS send/receive.
- Call/SMS synchronization.
- Android Telephony Gateway.
- Realtime Voice Gateway.
- Bidirectional realtime audio architecture.
- Device health/heartbeat.
- Offline/reconnect handling.
- Remote device revocation.

Implementation is deferred to the Channels/Voice phases.

A feature becomes COMPLETED only after implementation, testing, review, and verification.


### Phase 1 — Platform / Identity and Security Foundation

The following foundations are implemented and validated:

- Tenancy and tenant context.
- User identity and roles.
- Sessions with expiration and revocation.
- Centralized RBAC permissions.
- Tenant-bound audit events.
- Device identity and capabilities.
- Device access relationships.
- Device sessions.
- Device-session authorization guard.
- Device/session revocation propagation.
- Device-session lifecycle hardening.
- Device-session creation hardening.
- API session authentication.
- Authenticated `GET /api/v1/me` endpoint.

Remaining Phase 1 work must harden and complete authentication/authorization lifecycle behavior before moving to major clinic-domain features.
