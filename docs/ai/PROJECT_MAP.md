# Project Map
Target:
- `apps/` applications
- `packages/` shared libraries/domain packages
- `database/` migrations/schema/seeds where applicable
- `tests/` cross-application/E2E
- `infrastructure/` deployment/container/infra
- `docs/` documentation
- `docs/ai/` persistent AI memory

Domains: Identity, Tenancy, Clinic, Scheduling, Patient, Clinical, Dental, Billing, CRM, Messaging, Automation, AI, Reporting, Files, Audit, Integrations.

Current implementation map:

- `apps/api/`
  - HTTP server.
  - Request context.
  - API errors and HTTP helpers.
  - Authentication boundary.
  - Health route.
  - `/api/v1/me` route.
  - API tests.
- `apps/web/`
  - Web application workspace foundation.
- `apps/worker/`
  - Worker workspace foundation.
- `packages/db/`
  - PostgreSQL pool.
  - Migration runner.
  - Identity/session/device/audit persistence.
- `packages/auth/`
  - RBAC and authorization foundation.
- `packages/contracts/`
  - Shared API/domain contracts.
- `packages/types/`
  - Branded domain identifiers and shared types.
- `database/migrations/`
  - Transactional schema migrations.
- `docs/`
  - Product, technical, API, data-model, integration, backlog, and planning documentation.
- `docs/ai/`
  - Persistent AI project memory and workflow rules.

The original domain target map remains:
Identity, Tenancy, Clinic, Scheduling, Patient, Clinical, Dental, Billing, CRM, Messaging, Automation, AI, Reporting, Files, Audit, Integrations.
