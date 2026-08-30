# ClinicOS — Master Specification V1.0

## Vision
Build a commercial, scalable, multi-tenant SaaS platform for medical and dental clinics. Unify clinic operations, patient experience, CRM, billing, omnichannel communications, automation, analytics, and an AI receptionist.

## Commercial objective
Recurring SaaS revenue with configurable plans, branch/user limits, optional usage-based AI/voice/SMS billing, integrations, and enterprise plans. Pricing must be configurable, not hard-coded.

## Target customers
General medical clinics, dental clinics, multi-specialty clinics, clinic groups, multi-branch practices, medical centers, and dental chains.

## Users
Owner/admin, manager, doctor, dentist, receptionist, nurse/assistant, accountant, customer-service agent, marketer, patient.

## Product principles
- Multi-tenancy from day one
- Security/privacy by design
- API-first
- Modular architecture
- Auditability
- Arabic RTL + English LTR
- Responsive web UX
- Provider abstraction
- AI never bypasses authorization
- Human handoff always available
- Tests are part of completion

## Core modules

### Organization / tenancy
Organizations, branches, departments, locations, plans, usage, settings, branding, locale, timezone, currency, business hours, holidays.

### Identity / access
Authentication, sessions, password reset, MFA readiness, invitations, roles, permissions, branch scope, staff profiles, audit logs.

### Patients
Profiles, contacts, emergency contacts, demographics, communication preferences, consent, tags, notes, documents, attachments, timeline, duplicate detection/merge, portal identity.

### Scheduling
Providers, services, appointment types, calendars, working hours, breaks, holidays, rooms/chairs/resources, booking rules, conflict prevention, waitlist, reschedule, cancellation, no-show, recurring appointments, online booking.

### Medical clinical
Encounters, clinical notes, SOAP-style notes, symptoms, diagnoses, procedures, allergies, medications, vitals, attachments, care plans, follow-up, templates, history.

### Dental
Odontogram, tooth/surface records, conditions, procedures, treatment plans, stages, estimates, consent, imaging attachments, periodontal readiness, before/after media, lab tracking, dental templates.

### Billing
Invoices, invoice items, discounts, tax configuration, payments, refunds, receipts, balances, payment methods, packages, estimates, financial reports, payment provider abstraction.

### CRM
Leads, sources, campaigns, pipeline, stages, assignments, tasks, follow-ups, patient conversion, lost reasons, timeline, segmentation.

### Omnichannel inbox
WhatsApp, SMS, Telegram, Facebook Messenger, Facebook comments, Instagram messaging/comments where supported, email, website chat, voice/calls. Unified inbox, contacts, assignments, notes, tags, templates, attachments, statuses, SLA, handoff, consent/opt-out, webhooks, provider health.

### AI platform
Receptionist, booking, FAQ/knowledge, lead qualification, follow-up, no-show recovery, campaign assistant, staff copilot, voice agent.
AI tools: knowledge search, contact lookup, availability, appointment actions, lead/task creation, approved messaging, escalation, summaries.
Safety: tool authorization, tenant isolation, PII minimization, prompt-injection defenses, approvals for risky actions, audit trail, uncertainty handling, human escalation. No autonomous diagnosis, prescribing, medication changes, or clinical orders by default.

### Notifications / automation
Reminders, confirmation, cancellation, follow-up, recall, payment reminders, campaigns subject to consent, triggers/actions, templates, localization, delivery logs, retry/dead-letter.

### Patient portal
Profile, appointments, booking, forms, documents, treatment plans, invoices, payments where enabled, secure messages, notifications, consent.

### Reporting
Appointments, no-shows, revenue, balances, new patients, lead conversion, channel performance, staff performance, treatments, AI containment/handoff, response time, campaigns, branches.

## Non-functional requirements
Tenant isolation, encryption in transit, appropriate encryption at rest, secret management, least privilege, structured logs, metrics/tracing readiness, backups, restore tests, rate limiting, idempotent webhooks, pagination, indexes, N+1 avoidance, justified caching, accessibility, RTL/LTR, timezone-safe scheduling, safe money representation.

## Multi-tenancy
Tenant-owned records must be scoped. Never trust client-supplied tenant IDs. Derive tenant context from authenticated membership/session. Enforce authorization at service boundaries and test cross-tenant access. Background jobs carry tenant context safely.

## Audit
Audit authentication/security, patient access/changes, appointments, billing, permission changes, AI actions, integrations, exports/deletions, and admin changes.

## Integrations
Use adapters for messaging, SMS, voice, email, payments, storage, AI providers, calendars, and analytics. Verify external APIs and policies before implementation; never assume capabilities.

## Competitive advantage
24/7 AI receptionist, instant lead response, conversation booking, missed-call recovery, reminders, no-show recovery, follow-up, review/request campaigns, conversation analytics, AI summaries, human handoff, multilingual support, medical+dental in one platform.

Automatic likes/reactions on social comments are optional future capabilities only where official APIs and platform policies permit them.

## MVP
Multi-tenancy; auth/RBAC; organization/branch; staff; patients; providers; services; calendar/appointments; basic clinical; basic dental; billing; CRM; inbox foundation; notifications; basic AI receptionist; knowledge base; audit; basic reports; tests/CI; deployment foundation.

## Explicit early non-goals
Full hospital HIS, full ERP/accounting, autonomous diagnosis/prescribing, unofficial social scraping, provider lock-in, premature microservices.

## Success metrics
Activation, time to first booking, active clinics, appointment completion, retention, lead conversion, AI response time, containment, handoff, booking conversion, failed action rate, safety incidents, MRR, ARPA, churn, CAC, LTV, AI cost per clinic.

## Release gates
Tests/build pass; migration reviewed; sensitive changes security-reviewed; no critical known vulnerability; observability; backup/rollback; docs updated; Git diff reviewed; release notes recorded.
