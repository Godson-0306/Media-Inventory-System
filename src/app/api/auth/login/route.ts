import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  homePathForRole,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";
import { ensureAuthBackfill } from "@/lib/org";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid details" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    await ensureAuthBackfill();
    const user = await prisma.user.findFirst({
      where: { email },
      include: { org: true },
    });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Email or password is incorrect" },
        { status: 401 },
      );
    }
    if (user.status === "DISABLED") {
      return NextResponse.json(
        { error: "This account has been disabled. Ask your organization owner." },
        { status: 403 },
      );
    }

    await prisma.activity.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        action: "LOGIN",
      },
    });

    const role = user.role === "OWNER" ? "OWNER" : "STAFF";
    const token = await signSession({
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      name: user.name,
      role,
      orgName: user.org.name,
    });

    const response = NextResponse.json({ ok: true, redirectTo: homePathForRole(role) });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not sign in. Check the database connection." },
      { status: 500 },
    );
  }
}
