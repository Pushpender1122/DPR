import { type AlertType, type ClockStatus, type Prisma, type Severity } from "@prisma/client";

import type { AlertRecord, ClockInRecord, ShiftRecord } from "@/types";

export const shiftInclude = {
  guard: true,
  site: true,
  clockIns: {
    orderBy: {
      timestamp: "desc"
    },
    take: 1
  }
} satisfies Prisma.ShiftInclude;

export type ShiftWithRelations = Prisma.ShiftGetPayload<{
  include: typeof shiftInclude;
}>;

export function mapClockIn(clockIn: ShiftWithRelations["clockIns"][number] | null | undefined): ClockInRecord | null {
  if (!clockIn) {
    return null;
  }

  return {
    id: clockIn.id,
    timestamp: clockIn.timestamp.toISOString(),
    lat: clockIn.lat,
    lng: clockIn.lng,
    status: clockIn.status
  };
}

export function mapShift(shift: ShiftWithRelations): ShiftRecord {
  return {
    id: shift.id,
    guardId: shift.guardId,
    guardName: shift.guard.name,
    siteId: shift.siteId,
    siteName: shift.site.name,
    siteAddress: shift.site.address,
    siteLat: shift.site.lat,
    siteLng: shift.site.lng,
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    payRate: shift.payRate,
    status: shift.status,
    latestClockIn: mapClockIn(shift.clockIns[0] ?? null)
  };
}

export function mapAlert(alert: {
  id: string;
  type: AlertType;
  message: string;
  guardName: string;
  siteName: string;
  severity: Severity;
  read: boolean;
  createdAt: Date;
}): AlertRecord {
  return {
    ...alert,
    createdAt: alert.createdAt.toISOString()
  };
}

export function buildClockInAlert(args: {
  status: ClockStatus;
  guardName: string;
  siteName: string;
}): { type: AlertType; severity: Severity; message: string } {
  if (args.status === "LATE") {
    return {
      type: "LATE_CLOCK_IN",
      severity: "HIGH",
      message: `${args.guardName} clocked in late at ${args.siteName}.`
    };
  }

  if (args.status === "WRONG_LOCATION") {
    return {
      type: "WRONG_LOCATION",
      severity: "CRITICAL",
      message: `${args.guardName} clocked in from the wrong location for ${args.siteName}.`
    };
  }

  return {
    type: "ON_TIME_CLOCK_IN",
    severity: "LOW",
    message: `${args.guardName} clocked in on time at ${args.siteName}.`
  };
}

export function selectCurrentShift(shifts: ShiftRecord[]): ShiftRecord | null {
  const now = Date.now();
  const ranked = [...shifts].sort(
    (left, right) => Math.abs(new Date(left.startTime).getTime() - now) - Math.abs(new Date(right.startTime).getTime() - now)
  );

  return ranked[0] ?? null;
}
