import { Role, ShiftStatus } from "@prisma/client";
import { addMinutes } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { buildClockInAlert, mapClockIn, mapShift, shiftInclude } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/seed";
import { calculateDistanceMeters } from "@/lib/utils";
import type { ClockInScenario } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth || auth.role !== Role.GUARD) {
      return NextResponse.json({ error: "Guard access required." }, { status: 403 });
    }

    const body = (await request.json()) as {
      shiftId?: string;
      lat?: number;
      lng?: number;
      scenario?: ClockInScenario;
    };

    if (!body.shiftId || typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json({ error: "Shift and GPS coordinates are required." }, { status: 400 });
    }

    const existingClockIn = await prisma.clockIn.findFirst({
      where: { shiftId: body.shiftId, guardId: auth.userId }
    });

    if (existingClockIn) {
      return NextResponse.json({ error: "This shift has already been clocked in." }, { status: 400 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: body.shiftId },
      include: shiftInclude
    });

    if (!shift || shift.guardId !== auth.userId) {
      return NextResponse.json({ error: "Assigned shift not found." }, { status: 404 });
    }

    const effectiveTimestamp =
      body.scenario === "LATE"
        ? addMinutes(shift.startTime, 20)
        : new Date();

    const distance = calculateDistanceMeters(body.lat, body.lng, shift.site.lat, shift.site.lng);
    const status = distance > 250 ? "WRONG_LOCATION" : effectiveTimestamp > addMinutes(shift.startTime, 5) ? "LATE" : "ON_TIME";

    const clockIn = await prisma.clockIn.create({
      data: {
        guardId: auth.userId,
        shiftId: shift.id,
        timestamp: effectiveTimestamp,
        lat: body.lat,
        lng: body.lng,
        status
      }
    });

    await prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: ShiftStatus.ACTIVE
      }
    });

    const alert = buildClockInAlert({
      status,
      guardName: shift.guard.name,
      siteName: shift.site.name
    });

    await prisma.alert.create({
      data: {
        ...alert,
        guardName: shift.guard.name,
        siteName: shift.site.name
      }
    });

    const refreshedShift = await prisma.shift.findUnique({
      where: { id: shift.id },
      include: shiftInclude
    });

    if (!refreshedShift) {
      return NextResponse.json({ error: "Unable to reload shift." }, { status: 500 });
    }

    return NextResponse.json({
      message:
        status === "ON_TIME"
          ? "On-time clock-in captured and shared with the control room."
          : status === "LATE"
            ? "Late arrival logged and escalated to the admin alert dashboard."
            : "Wrong-location clock-in captured and escalated immediately.",
      clockIn: mapClockIn(clockIn),
      shift: mapShift(refreshedShift)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to clock in." }, { status: 500 });
  }
}
