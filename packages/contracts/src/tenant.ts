import type { BranchId, TenantId } from "@clinicos/types/tenant";

export interface TenantContext {
  tenantId: TenantId;
  branchId?: BranchId;
}
