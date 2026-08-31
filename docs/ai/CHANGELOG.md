# Changelog

## 2026-08-30
Created Master Specification baseline; defined product, technical, AI/omnichannel, security, QA, roadmap, implementation phases, memory system, and GitHub/Termux verification workflow. Repository is pre-implementation.

## 2026-08-30 — Repository Foundation
Started Sprint 0 repository foundation. Created the initial monorepo structure with npm workspaces, root TypeScript configuration, repository ignore/npm configuration, six workspace package manifests, and package-lock.json. Validated JSON structure, workspace entries in the lockfile, Git whitespace integrity, absence of secrets in new files, and absence of node_modules. Repository foundation remains in progress.

## 2026-08-31 — Tooling and Test Foundation
Installed and verified the TypeScript, ESLint, and Vitest development toolchain on the Linux development environment. Added ESLint flat configuration and a root Vitest smoke test. Updated the root test script so `npm test` executes Vitest directly. Verified typecheck, lint, smoke test, Git whitespace integrity, and npm audit with zero vulnerabilities.

## 2026-08-31 — Android Telephony and Realtime Voice Architecture

Updated the ClinicOS architecture and implementation plan to reserve first-class support for a future integrated Android application.

The Android application will be capable, where supported by the device and Android version, of acting as a ClinicOS client, Android Telephony Gateway, SMS Gateway, and Realtime Voice Gateway.

The architecture explicitly targets broad Android compatibility, including Android 5.x where technically feasible, Android 6.x–8.x, and modern Android.

Added requirements for device identity, capability detection, permission state, telephony/SMS events, realtime voice sessions, secure bidirectional audio transport, offline handling, device health, revocation, observability, and compatibility testing.

The Android implementation remains intentionally deferred to the later Channels/Voice phases while the backend contracts and architecture are established from the beginning.
