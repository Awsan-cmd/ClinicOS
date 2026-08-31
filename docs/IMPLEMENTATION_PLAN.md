# Implementation Plan

## Global Architecture Principle

ClinicOS is designed from the beginning as a multi-tenant clinic operating system with a web application, API/application layer, asynchronous workers, integrations, AI services, and a future Android client/gateway.

The Android application is not a separate product architecture. It is a first-class ClinicOS client capable of acting as an Android Telephony Gateway and Realtime Voice Gateway where the device and Android version permit the required capabilities.

The architecture must therefore reserve stable APIs, contracts, authentication, event models, realtime transport, device registration, permissions/capabilities, telephony state, SMS state, and audio streaming interfaces from the beginning.

Every phase must be split into small testable tasks.

---

## Phase 0 — Repository Foundation

Repository, documentation, persistent AI memory, TypeScript/tooling, package structure, environment configuration, Git workflow, Docker foundation, CI foundation, and test foundation.

### Phase 0 requirements

- Monorepo/workspace foundation.
- TypeScript.
- ESLint.
- Vitest.
- Docker and Docker Compose.
- Environment configuration.
- PostgreSQL.
- Redis.
- Health checks.
- CI.
- Structured logging foundation.
- API/application conventions.
- Shared contracts/types foundation.
- Stable API versioning strategy.
- Authentication/token strategy reserved for web and Android clients.
- Device identity model reserved for future Android devices.
- Realtime communication architecture reserved for future Android clients.
- Event and webhook conventions.
- Tenant-aware request and job context.
- No secrets committed to Git.

### Android compatibility requirement introduced in Phase 0

The project must not make architectural decisions that prevent a future Android application from supporting the broadest practical Android range.

Initial target compatibility strategy:

- Legacy compatibility target: Android 5.x where technically feasible.
- Android 6.x–8.x: explicitly supported design target.
- Modern Android: fully supported design target.
- Capability detection at runtime.
- Version-specific implementations where APIs differ.
- Graceful degradation where Android/OEM restrictions prevent a capability.
- No assumption that all permissions can be automatically granted.
- Device enrollment and capability reporting are mandatory concepts.
- Telephony, SMS, microphone, audio routing, background execution, notification, battery optimization, and networking capabilities must be represented explicitly.

The exact minimum SDK, target SDK, build tools, and compatibility matrix are implementation decisions to be validated during the Android phase against current Android SDK/tooling constraints.

---

## Phase 1 — Platform

Database/migrations, tenancy, organizations/branches, authentication, sessions, RBAC, audit, API identity, device identity, capability model, and security foundation.

### Android/device platform foundation

Introduce domain concepts for:

- Clinic device.
- Android device registration.
- Device authentication.
- Device enrollment/revocation.
- Device-to-tenant binding.
- Device-to-branch binding.
- Device capabilities.
- Android version/API level.
- App version.
- Connectivity state.
- Last heartbeat.
- Permission state.
- Telephony capability state.
- SMS capability state.
- Audio capability state.
- Realtime connection state.
- Device health.
- Remote configuration.

Security requirements:

- A device must never be trusted only because it has a valid tenant identifier.
- Device credentials must be independently revocable.
- Every device action must resolve tenant and authorized device context.
- Device-originated events must be authenticated and correlated.
- Device commands must be authorized.
- Sensitive telephony/audio operations must be auditable.

---

## Phase 2 — Clinic

Staff/providers, services, patients, calendar, scheduling, appointment lifecycle.

### Telephony-aware clinic integration

Prepare:

- Patient phone number normalization.
- Multiple phone numbers.
- Phone number ownership/identity mapping.
- Incoming caller matching.
- Outgoing call association.
- Call history model.
- SMS conversation association.
- Appointment context available to telephony events.
- Branch/device routing.
- Staff assignment for calls/conversations.

The clinic system must be able to associate a phone call or SMS conversation with:

- Tenant.
- Branch.
- Patient.
- Lead where applicable.
- Staff member where applicable.
- Device.
- Phone number.
- Conversation/thread.
- Appointment where applicable.

---

## Phase 3 — Clinical

Encounters, notes, diagnoses/allergies/medications, attachments, templates.

Telephony and messaging must not bypass clinical authorization boundaries.

Clinical information exposed to telephony/AI clients must use explicit authorization and minimum necessary data.

---

## Phase 4 — Dental

Odontogram, tooth records, treatment plans, dental workflow.

Telephony interactions may reference dental appointments, leads, treatment plans, and follow-ups only through authorized domain services.

---

## Phase 5 — Billing

Invoices, payments, receipts, balances, reports.

Telephony/SMS/AI flows may provide billing-related communication but must not expose or modify billing information without explicit authorization.

---

## Phase 6 — CRM

Leads, pipeline, tasks, campaigns, follow-ups.

### Telephony/CRM integration

Calls and SMS become first-class CRM events.

Support:

- Incoming call → lead lookup.
- Incoming call → patient lookup.
- Outgoing call → lead/patient association.
- Missed call → follow-up task.
- SMS received → conversation.
- SMS sent → conversation.
- Call disposition.
- Follow-up scheduling.
- Campaign attribution.
- No-answer tracking.
- Recording/voice metadata where legally and technically supported.
- AI handoff metadata.

---

## Phase 7 — Messaging

Conversation model, inbox, templates, notifications, webhooks.

### Unified conversation architecture

The messaging model must support:

- Web chat.
- SMS.
- WhatsApp.
- Telegram.
- Messenger.
- Instagram/Facebook where supported.
- Email.
- Voice/call events.
- Future channels.

SMS through Android must be represented as a provider/channel adapter rather than hard-coded into the core messaging domain.

---

## Phase 8 — Channels

WhatsApp, SMS, Telegram, Messenger, Instagram/Facebook where supported, Email, Voice.

### Phase 8A — Android Telephony Gateway

Implement the first-party ClinicOS Android application.

The application is a unified Android client with optional gateway capabilities.

Core responsibilities:

- Device enrollment.
- Secure authentication.
- Tenant/branch binding.
- Device heartbeat.
- Capability reporting.
- Permission state reporting.
- Incoming call detection.
- Outgoing call initiation where permitted.
- Call state reporting.
- Call history synchronization where permitted.
- SMS receiving where permitted.
- SMS sending where permitted.
- SMS synchronization.
- Notification handling.
- Background connectivity.
- Realtime connection to ClinicOS.
- Audio transport where supported.
- Remote device configuration.
- Offline queueing.
- Retry/idempotency.
- Local encrypted state.
- Remote logout/revocation.

### Android compatibility strategy

The application must use a compatibility layer instead of assuming one Android API behavior.

Required architecture:

-
