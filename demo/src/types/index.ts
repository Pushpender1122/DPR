export type AppRole = "ADMIN" | "GUARD" | "CLIENT";
export type ShiftStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "MISSED";
export type ClockStatus = "ON_TIME" | "LATE" | "WRONG_LOCATION";
export type AlertType =
  | "LATE_CLOCK_IN"
  | "MISSED_CLOCK_IN"
  | "LONE_WORKER_MISSED"
  | "WRONG_LOCATION"
  | "ON_TIME_CLOCK_IN";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ClockInScenario = "ON_TIME" | "LATE" | "WRONG_LOCATION";

export interface DemoSession {
  token: string;
  user: DemoUser;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  siteId?: string | null;
  siteName?: string | null;
}

export interface SiteOption {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

export interface ClockInRecord {
  id: string;
  timestamp: string;
  lat: number;
  lng: number;
  status: ClockStatus;
}

export interface ShiftRecord {
  id: string;
  guardId: string;
  guardName: string;
  siteId: string;
  siteName: string;
  siteAddress: string;
  siteLat: number;
  siteLng: number;
  startTime: string;
  endTime: string;
  payRate: number;
  status: ShiftStatus;
  latestClockIn?: ClockInRecord | null;
}

export interface AlertRecord {
  id: string;
  type: AlertType;
  message: string;
  guardName: string;
  siteName: string;
  severity: Severity;
  read: boolean;
  createdAt: string;
}

export interface ShiftsResponse {
  shifts: ShiftRecord[];
  guards: UserOption[];
  sites: SiteOption[];
  currentShift: ShiftRecord | null;
}

export interface ClockInResponse {
  message: string;
  clockIn: ClockInRecord;
  shift: ShiftRecord;
}

export interface TimesheetEntry {
  shiftId: string;
  date: string;
  guardName: string;
  siteName: string;
  scheduled: string;
  clockIn: string;
  hours: number;
  payRate: number;
  totalPay: number;
  status: string;
}

export interface ClientPortalResponse {
  site: SiteOption;
  onShiftToday: ShiftRecord[];
  timesheet: TimesheetEntry[];
}
