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

---

# Android Client and Telephony Gateway Architecture

## Purpose

ClinicOS includes a future first-party Android application that can operate as:

1. A normal ClinicOS mobile client.
2. An Android Telephony Gateway.
3. An SMS Gateway.
4. A Realtime Voice Gateway where supported by the Android device/version.
5. A device-management endpoint for ClinicOS.

The Android application is part of the ClinicOS architecture and must be considered from the beginning even though implementation is scheduled for the later Channels/Voice phases.

## Compatibility

The Android architecture must support the broadest practical range of Android versions.

Design targets include:

- Android 5.x legacy compatibility where technically feasible.
- Android 6.x–8.x.
- Modern Android releases.

Compatibility is implemented through capability detection and adapter interfaces rather than version-specific assumptions in the core application.

## Android modules

The future application should be organized around explicit modules such as:

-
