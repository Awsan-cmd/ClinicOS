export type BookingRuleRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  providerId: string | null;
  serviceId: string | null;
  appointmentTypeId: string | null;
  resourceId: string | null;
  advanceBookingDays: number;
  minimumNoticeMinutes: number;
  isActive: boolean;
  createdAt: string;
};
