import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { mapAlert } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth || auth.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({ alerts: alerts.map(mapAlert) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load alerts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth || (auth.role !== Role.ADMIN && auth.role !== Role.GUARD)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = (await request.json()) as {
      type?: "LATE_CLOCK_IN" | "MISSED_CLOCK_IN" | "LONE_WORKER_MISSED" | "WRONG_LOCATION" | "ON_TIME_CLOCK_IN";
      message?: string;
      guardName?: string;
      siteName?: string;
      severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    };

    if (!body.type || !body.message || !body.guardName || !body.siteName || !body.severity) {
      return NextResponse.json({ error: "Complete alert details are required." }, { status: 400 });
    }

    const alert = await prisma.alert.create({
      data: {
        type: body.type,
        message: body.message,
        guardName: body.guardName,
        siteName: body.siteName,
        severity: body.severity
      }
    });

    return NextResponse.json({ alert: mapAlert(alert), message: "Alert created successfully." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create alert." }, { status: 500 });
  }
}
