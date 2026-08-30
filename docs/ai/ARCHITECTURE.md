# Architecture
Current direction: modular monolith + async workers. Extract services only when scale/isolation/team ownership justifies it.
Flow: Web/PWA → API/Application → Domain Services → Data Access → PostgreSQL.
Async: API → Queue → Worker → integrations/notifications/AI jobs.
External systems use provider adapters.
Tenant context is mandatory at request/job entry. Domain services cannot bypass authorization. AI tools cannot access the DB directly. Clinical and billing are sensitive.
