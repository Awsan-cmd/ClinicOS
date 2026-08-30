# API Specification
Use `/api/v1/...`, JSON, typed validation, consistent errors, pagination, filters only when documented, idempotency for retried sensitive operations, request/correlation IDs, server-side authorization.

Domains include patients, appointments, leads, conversations, AI actions, and provider webhooks.

Never expose unnecessary DB details; never trust tenant IDs; validate input; rate-limit public endpoints; authenticate/verify webhook signatures; make webhook processing idempotent; never return secrets.
