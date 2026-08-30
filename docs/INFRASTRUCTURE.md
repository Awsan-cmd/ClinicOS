# Infrastructure
Environments: local, CI/test, staging, production.
Baseline: web/API, workers, PostgreSQL, Redis, object storage, load balancer/reverse proxy, secret management, monitoring/logging, backups.
CI: install, lint, typecheck, unit tests, integration tests as applicable, build.
Production: reproducible builds, environment secrets outside Git, health checks, migrations review, rollback plan, backups and restore testing, least privilege.
