"use server";

import { prisma } from "@/lib/db";
import { hashPassword, requireAdminUnlocked } from "@/lib/auth";
import { memberSchema } from "@/lib/validations";
import { refresh } from "@/lib/revalidate";

export async function addMember(input: unknown) {
  const unlocked = await requireAdminUnlocked();
  if (unlocked.error || !unlocked.session) {
    return { error: unlocked.error ?? "Admin unlock required" };
  }
  const session = unlocked.session;
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid member details" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const user = await prisma.user.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "OPERATOR",
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "MEMBER_ADDED",
      details: { memberName: user.name, memberEmail: user.email, memberId: user.id },
    },
  });
  refresh();
  return { ok: true };
}
