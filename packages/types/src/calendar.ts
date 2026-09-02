export type ResourceType =
  | "room"
  | "chair"
  | "equipment"
  | "other";

export type ResourceRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  code: string;
  name: string;
  resourceType: ResourceType;
  isActive: boolean;
  createdAt: string;
};

export type AvailabilityRuleRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  providerId: string | null;
  resourceId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
};
