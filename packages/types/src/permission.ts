import type { UserRole } from "./identity.js";

export type Permission =
  | "tenant:read"
  | "tenant:manage"
  | "branch:read"
  | "branch:manage"
  | "user:read"
  | "user:manage"
  | "staff:read"
  | "staff:manage"
  | "provider:read"
  | "provider:manage"
  | "service:read"
  | "service:manage"
  | "resource:read"
  | "resource:manage"
  | "availability:read"
  | "availability:manage"
  | "working_hours:read"
  | "working_hours:manage"
  | "schedule_break:read"
  | "schedule_break:manage"
  | "holiday:read"
  | "holiday:manage"
  | "patient:read"
  | "patient:manage"
  | "appointment:read"
  | "appointment:manage"
  | "appointment_type:read"
  | "appointment_type:manage"
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
    "staff:read",
    "staff:manage",
    "provider:read",
    "provider:manage",
    "service:read",
    "service:manage",
    "resource:read",
    "resource:manage",
    "availability:read",
    "availability:manage",
    "working_hours:read",
    "working_hours:manage",
    "schedule_break:read",
    "schedule_break:manage",
    "holiday:read",
    "holiday:manage",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "appointment_type:read",
    "appointment_type:manage",
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
    "staff:read",
    "staff:manage",
    "provider:read",
    "provider:manage",
    "service:read",
    "service:manage",
    "resource:read",
    "resource:manage",
    "availability:read",
    "availability:manage",
    "working_hours:read",
    "working_hours:manage",
    "schedule_break:read",
    "schedule_break:manage",
    "holiday:read",
    "holiday:manage",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "appointment_type:read",
    "appointment_type:manage",
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
    "staff:read",
    "staff:manage",
    "provider:read",
    "provider:manage",
    "service:read",
    "service:manage",
    "resource:read",
    "resource:manage",
    "availability:read",
    "availability:manage",
    "working_hours:read",
    "working_hours:manage",
    "schedule_break:read",
    "schedule_break:manage",
    "holiday:read",
    "holiday:manage",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment:manage",
    "appointment_type:read",
    "appointment_type:manage",
    "clinical:read",
    "billing:read",
    "device:read",
    "audit:read",
  ],
  doctor: [
    "staff:read",
    "provider:read",
    "branch:read",
    "service:read",
    "resource:read",
    "availability:read",
    "working_hours:read",
    "schedule_break:read",
    "holiday:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment_type:read",
    "appointment:manage",
    "clinical:read",
    "clinical:manage",
  ],
  receptionist: [
    "staff:read",
    "provider:read",
    "branch:read",
    "service:read",
    "resource:read",
    "availability:read",
    "working_hours:read",
    "schedule_break:read",
    "holiday:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment_type:read",
    "appointment:manage",
  ],
  nurse: [
    "staff:read",
    "provider:read",
    "branch:read",
    "service:read",
    "resource:read",
    "availability:read",
    "working_hours:read",
    "schedule_break:read",
    "holiday:read",
    "patient:read",
    "patient:manage",
    "appointment:read",
    "appointment_type:read",
    "clinical:read",
    "clinical:manage",
  ],
};
