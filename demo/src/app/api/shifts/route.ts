import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { mapShift, selectCurrentShift, shiftInclude } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (auth.role === Role.ADMIN) {
      const [shifts, guards, sites] = await Promise.all([
        prisma.shift.findMany({ include: shiftInclude, orderBy: { startTime: "asc" } }),
        prisma.user.findMany({ where: { role: Role.GUARD }, select: { id: true, name: true, email: true } }),
        prisma.site.findMany({ orderBy: { name: "asc" } })
      ]);

      return NextResponse.json({
        shifts: shifts.map(mapShift),
        guards,
        sites,
        currentShift: null
      });
    }

    if (auth.role === Role.GUARD) {
      const shifts = await prisma.shift.findMany({
        where: { guardId: auth.userId },
        include: shiftInclude,
        orderBy: { startTime: "asc" }
      });
      const mapped = shifts.map(mapShift);

      return NextResponse.json({
        shifts: mapped,
        guards: [],
        sites: [],
        currentShift: selectCurrentShift(mapped)
      });
    }

    if (!auth.siteId) {
      return NextResponse.json({ error: "Client site not configured." }, { status: 400 });
    }

    const siteShifts = await prisma.shift.findMany({
      where: { siteId: auth.siteId },
      include: shiftInclude,
      orderBy: { startTime: "asc" }
    });

    return NextResponse.json({
      shifts: siteShifts.map(mapShift),
      guards: [],
      sites: [],
      currentShift: null
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load shifts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth || auth.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = (await request.json()) as {
      guardId?: string;
      siteId?: string;
      startTime?: string;
      endTime?: string;
      payRate?: number;
    };

    if (!body.guardId || !body.siteId || !body.startTime || !body.endTime || !body.payRate) {
      return NextResponse.json({ error: "All shift fields are required." }, { status: 400 });
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      return NextResponse.json({ error: "Invalid shift date range." }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        guardId: body.guardId,
        siteId: body.siteId,
        startTime,
        endTime,
        payRate: Number(body.payRate)
      },
      include: shiftInclude
    });

    return NextResponse.json({ shift: mapShift(shift) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create shift." }, { status: 500 });
  }
}
