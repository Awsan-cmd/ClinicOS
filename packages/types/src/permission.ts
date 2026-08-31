import type { UserRole } from "./identity.js";

export type Permission =
  | "tenant:read"
  | "tenant:manage"
  | "branch:read"
  | "branch:manage"
  | "user:read"
  | "user:manage"
  | "patient:read"
  | "patient:manage"
  | "appointment:read"
  | "appointment:manage"
  | "clinical:read"
  | "clinical:manage"
  | "billing:read"
  | "billing:manage"
  | "device:read"
  | "device:manage"
  | "audit:read";

export const ROLE_PERMISSIONS: Readonly<
  Record<UserRole, readonly Permission[]>
> = {
  owner: [
    "tenant:read",
    "tenant:manage",
    "branch:read",
    "branch:manage",
    "user:read",
    "user:manage",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "clinical:read",
    "clinical:manage",
    "billing:read",
    "billing:manage",
    "device:read",
    "device:manage",
    "audit:read",
  ],
  admin: [
    "tenant:read",
    "branch:read",
    "branch:manage",
    "user:read",
    "user:manage",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "clinical:read",
    "clinical:manage",
    "billing:read",
    "billing:manage",
    "device:read",
    "device:manage",
    "audit:read",
  ],
  manager: [
    "branch:read",
    "user:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "clinical:read",
    "billing:read",
    "device:read",
    "audit:read",
  ],
  doctor: [
    "branch:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "clinical:read",
    "clinical:manage",
  ],
  receptionist: [
    "branch:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
  ],
  nurse: [
    "branch:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "clinical:read",
    "clinical:manage",
  ],
};
