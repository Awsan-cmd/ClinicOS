export type WorkingHoursRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
};

export type ScheduleBreakRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
};

export type HolidayRecord = {
  id: string;
  tenantId: string;
  branchId: string | null;
  holidayDate: string;
  name: string | null;
  isFullDay: boolean;
  isActive: boolean;
  createdAt: string;
};
