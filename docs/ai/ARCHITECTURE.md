# Architecture
Current direction: modular monolith + async workers. Extract services only when scale/isolation/team ownership justifies it.
Flow: Web/PWA → API/Application → Domain Services → Data Access → PostgreSQL.
Async: API → Queue → Worker → integrations/notifications/AI jobs.
External systems use provider adapters.
Tenant context is mandatory at request/job entry. Domain services cannot bypass authorization. AI tools cannot access the DB directly. Clinical and billing are sensitive.


## Authentication Boundary

API authentication resolves a bearer session token into an authenticated user and explicit tenant/branch context.

The flow is:

Authorization header
→ bearer token extraction
→ SHA-256 token hash
→ active session lookup
→ tenant-bound user identity lookup
→ `AuthenticatedUser`
→ request context
→ protected API route

The API must not trust tenant, branch, user, or device identifiers supplied independently of the authenticated session.

Authorization remains a separate concern and must be enforced through the centralized permission model before sensitive domain operations.

The `/api/v1/me` endpoint is the initial verified API identity boundary.

## Request Context Lifecycle

Each incoming API request creates exactly one request-scoped context.

The context is created at the HTTP server boundary and passed explicitly into the route handler.

Flow:

HTTP request
→ create request context once
→ route handler receives same context
→ authentication / authorization
→ endpoint handler

Route handlers must not recreate the request context.

This guarantees that authentication and authorization decisions within one request operate on the same request-scoped identity/context object.
