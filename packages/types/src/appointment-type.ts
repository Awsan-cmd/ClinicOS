export type AppointmentTypeRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};
