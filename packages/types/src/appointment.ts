export type AppointmentType =
  | "standard"
  | "follow_up"
  | "consultation"
  | "procedure";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  patientId: string;
  providerId: string;
  serviceId: string;
  resourceId: string | null;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  createdAt: string;
};
