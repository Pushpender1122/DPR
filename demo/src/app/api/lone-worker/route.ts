import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/seed";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await seedDemoData();
    const auth = getAuthFromRequest(request);

    if (!auth || auth.role !== Role.GUARD) {
      return NextResponse.json({ error: "Guard access required." }, { status: 403 });
    }

    const body = (await request.json()) as { status?: "SAFE" | "MISSED" };

    if (!body.status) {
      return NextResponse.json({ error: "Status is required." }, { status: 400 });
    }

    await prisma.loneWorkerCheckin.create({
      data: {
        guardId: auth.userId,
        status: body.status
      }
    });

    if (body.status === "MISSED") {
      await prisma.alert.create({
        data: {
          type: "LONE_WORKER_MISSED",
          message: `${auth.name} missed the 15-minute lone worker safety confirmation.`,
          guardName: auth.name,
          siteName: auth.siteName ?? "Assigned site",
          severity: "CRITICAL"
        }
      });
    }

    return NextResponse.json({
      message: body.status === "SAFE" ? "Safety confirmation received." : "Missed check-in escalated."
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record lone worker status." }, { status: 500 });
  }
}
