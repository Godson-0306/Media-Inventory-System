import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, sessionCookieOptions, signSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid details" },
        { status: 400 },
      );
    }

    const { organizationName, ownerName, email, password } = parsed.data;
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug: slugify(organizationName),
        },
      });
      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: email.toLowerCase(),
          passwordHash,
          name: ownerName,
          role: "OWNER",
        },
      });
      await tx.activity.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: "REGISTER",
          details: { organizationName },
        },
      });
      return { org, user };
    });

    const token = await signSession({
      userId: result.user.id,
      orgId: result.org.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      orgName: result.org.name,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not create the organization. Check the database connection." },
      { status: 500 },
    );
  }
}
