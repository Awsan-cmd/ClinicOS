# Technical Specification
Start with a modular monolith plus asynchronous workers. Extract services only when scale or isolation justifies it.

Recommended baseline:
- TypeScript
- Next.js web application
- Node.js API/application layer
- PostgreSQL
- Redis
- Background job system
- Object storage
- Docker
- GitHub Actions
- OpenAPI
- Unit/integration/e2e testing

Layers: Presentation → API/application → domain/services → repositories/data → PostgreSQL.
Async: API → queue → worker → domain/integration services.
External systems are accessed through provider adapters.

Domains: Identity, Tenancy, Clinic, Scheduling, Patient, Clinical, Dental, Billing, CRM, Messaging, Automation, AI, Reporting, Files, Audit, Integrations.

Rules: dependency inversion, explicit services, validation at boundaries, centralized authorization, transactions, idempotency, correlation IDs, structured errors, version APIs when needed.
