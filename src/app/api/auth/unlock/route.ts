import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSession,
  sessionCookieOptions,
  signAdminUnlock,
  verifyPassword,
} from "@/lib/auth";
import { unlockSchema } from "@/lib/validations";
import { ADMIN_COOKIE, ADMIN_UNLOCK_MAX_AGE } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Password required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Password confirmation failed" },
        { status: 401 },
      );
    }

    await prisma.activity.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        action: "ADMIN_UNLOCK",
      },
    });

    const token = await signAdminUnlock(session.userId);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      ADMIN_COOKIE,
      token,
      sessionCookieOptions(ADMIN_UNLOCK_MAX_AGE),
    );
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not unlock admin mode" },
      { status: 500 },
    );
  }
}
