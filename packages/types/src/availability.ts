export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
};

export type AvailabilityQuery = {
  branchId: string;
  providerId: string;
  serviceId: string;
  startDate: string;
  endDate: string;
  appointmentTypeId?: string;
  resourceId?: string;
};

export type AvailabilityResult = {
  slots: AvailabilitySlot[];
};
