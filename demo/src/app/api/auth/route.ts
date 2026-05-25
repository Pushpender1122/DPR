import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { signAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/seed";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await seedDemoData();
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { clientSite: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(body.password, user.password);

    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      siteId: user.clientSiteId,
      siteName: user.clientSite?.name ?? null
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        siteId: user.clientSiteId,
        siteName: user.clientSite?.name ?? null
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed." },
      { status: 500 }
    );
  }
}
