import bcrypt from "bcryptjs";
import { type AlertType, type ClockStatus, type Prisma, Role, type Severity, ShiftStatus } from "@prisma/client";
import { addDays, setHours, setMinutes, startOfWeek, subDays } from "date-fns";

import { prisma } from "@/lib/db";

function atTime(date: Date, hours: number, minutes: number): Date {
  return setMinutes(setHours(date, hours), minutes);
}

async function createAlert(data: {
  type: AlertType;
  message: string;
  guardName: string;
  siteName: string;
  severity: Severity;
}): Promise<void> {
  await prisma.alert.create({ data });
}

export async function seedDemoData(): Promise<void> {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    return;
  }

  const password = await bcrypt.hash("demo123", 10);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const site = await prisma.site.create({
    data: {
      name: "Canary Wharf Command Centre",
      address: "1 Bank Street, London E14 4SG",
      lat: 51.5074,
      lng: -0.1278
    }
  });

  const [admin, guard, client] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@demo.com",
        name: "Sarah Bennett",
        password,
        role: Role.ADMIN
      }
    }),
    prisma.user.create({
      data: {
        email: "guard@demo.com",
        name: "Marcus Reed",
        password,
        role: Role.GUARD
      }
    }),
    prisma.user.create({
      data: {
        email: "client@demo.com",
        name: "Olivia Carter",
        password,
        role: Role.CLIENT,
        clientSiteId: site.id
      }
    })
  ]);

  const baseShifts: Prisma.ShiftCreateManyInput[] = [
    {
      guardId: guard.id,
      siteId: site.id,
      startTime: atTime(subDays(new Date(), 2), 8, 0),
      endTime: atTime(subDays(new Date(), 2), 16, 0),
      payRate: 18.5,
      status: ShiftStatus.COMPLETED
    },
    {
      guardId: guard.id,
      siteId: site.id,
      startTime: atTime(subDays(new Date(), 1), 8, 0),
      endTime: atTime(subDays(new Date(), 1), 16, 0),
      payRate: 18.5,
      status: ShiftStatus.COMPLETED
    },
    {
      guardId: guard.id,
      siteId: site.id,
      startTime: new Date(Date.now() + 5 * 60 * 1000),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
      payRate: 20,
      status: ShiftStatus.SCHEDULED
    },
    {
      guardId: guard.id,
      siteId: site.id,
      startTime: atTime(addDays(weekStart, 3), 20, 0),
      endTime: atTime(addDays(weekStart, 4), 4, 0),
      payRate: 22,
      status: ShiftStatus.SCHEDULED
    },
    {
      guardId: guard.id,
      siteId: site.id,
      startTime: atTime(addDays(weekStart, 5), 9, 0),
      endTime: atTime(addDays(weekStart, 5), 17, 0),
      payRate: 19,
      status: ShiftStatus.SCHEDULED
    }
  ];

  await prisma.shift.createMany({ data: baseShifts });

  const shifts = await prisma.shift.findMany({
    where: { guardId: guard.id },
    orderBy: { startTime: "asc" }
  });

  const historicalClockIns: Array<{ shiftIndex: number; status: ClockStatus; minutesLate: number }> = [
    { shiftIndex: 0, status: "ON_TIME", minutesLate: 0 },
    { shiftIndex: 1, status: "LATE", minutesLate: 12 }
  ];

  for (const record of historicalClockIns) {
    const shift = shifts[record.shiftIndex];
    const timestamp = new Date(shift.startTime.getTime() + record.minutesLate * 60 * 1000);

    await prisma.clockIn.create({
      data: {
        guardId: guard.id,
        shiftId: shift.id,
        timestamp,
        lat: 51.5074,
        lng: -0.1278,
        status: record.status
      }
    });
  }

  await prisma.loneWorkerCheckin.create({
    data: {
      guardId: guard.id,
      status: "SAFE"
    }
  });

  await createAlert({
    type: "ON_TIME_CLOCK_IN",
    message: "Weekly health check complete. Guard activity monitoring is active for this site.",
    guardName: guard.name,
    siteName: site.name,
    severity: "LOW"
  });

  void admin;
  void client;
}
