export type ServiceRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  code: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
};
