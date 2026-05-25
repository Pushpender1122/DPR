import { Role } from "@prisma/client";
import { endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { mapShift, shiftInclude } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth || auth.role !== Role.CLIENT || !auth.siteId) {
      return NextResponse.json({ error: "Client access required." }, { status: 403 });
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const [site, currentWeekShifts] = await Promise.all([
      prisma.site.findUnique({ where: { id: auth.siteId } }),
      prisma.shift.findMany({
        where: {
          siteId: auth.siteId,
          startTime: {
            gte: weekStart,
            lte: weekEnd
          }
        },
        include: shiftInclude,
        orderBy: { startTime: "asc" }
      })
    ]);

    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }

    const mappedShifts = currentWeekShifts.map(mapShift);
    const onShiftToday = mappedShifts.filter((shift) => isSameDay(new Date(shift.startTime), new Date()));

    const timesheet = mappedShifts.map((shift) => {
      const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 36e5;
      return {
        shiftId: shift.id,
        date: shift.startTime,
        guardName: shift.guardName,
        siteName: shift.siteName,
        scheduled: `${format(new Date(shift.startTime), "HH:mm")} - ${format(new Date(shift.endTime), "HH:mm")}`,
        clockIn: shift.latestClockIn ? format(new Date(shift.latestClockIn.timestamp), "HH:mm") : "Pending",
        hours,
        payRate: shift.payRate,
        totalPay: hours * shift.payRate,
        status: shift.latestClockIn?.status.replace(/_/g, " ") ?? shift.status
      };
    });

    return NextResponse.json({
      site,
      onShiftToday,
      timesheet
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load client portal." }, { status: 500 });
  }
}
