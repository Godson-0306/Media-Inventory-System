"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";
import { requireOwner } from "@/lib/authz";
import {
  allocateJoinCode,
  generateInviteToken,
  inviteExpiresAt,
  normalizeJoinCode,
} from "@/lib/org";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";
import { refresh } from "@/lib/revalidate";
import {
  joinWithCodeSchema,
  joinWithTokenSchema,
  memberInviteSchema,
} from "@/lib/validations";

async function emailTaken(email: string) {
  return prisma.user.findFirst({ where: { email } });
}

async function startStaffSession(input: {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  orgName: string;
}) {
  const token = await signSession({
    userId: input.userId,
    orgId: input.orgId,
    email: input.email,
    name: input.name,
    role: "STAFF",
    orgName: input.orgName,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
}

export async function createInvite(
  input: unknown,
): Promise<{ error: string } | { ok: true; token: string; path: string }> {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const parsed = memberInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite details" };
  }

  const email = parsed.data.email;
  const inviteEmail = email ? email : null;
  if (inviteEmail && (await emailTaken(inviteEmail))) {
    return { error: "An account with this email already exists" };
  }

  const invite = await prisma.orgInvite.create({
    data: {
      orgId: auth.session.orgId,
      token: generateInviteToken(),
      email: inviteEmail,
      expiresAt: inviteExpiresAt(),
      createdByUserId: auth.session.userId,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: auth.session.orgId,
      userId: auth.session.userId,
      action: "MEMBER_INVITED",
      details: { inviteId: invite.id, email: inviteEmail },
    },
  });
  refresh();
  return { ok: true, token: invite.token, path: `/join/${invite.token}` };
}

export async function rotateJoinCode() {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const joinCode = await allocateJoinCode();
  await prisma.organization.update({
    where: { id: auth.session.orgId },
    data: { joinCode },
  });
  await prisma.activity.create({
    data: {
      orgId: auth.session.orgId,
      userId: auth.session.userId,
      action: "JOIN_CODE_ROTATED",
    },
  });
  refresh();
  return { ok: true, joinCode };
}

export async function setMemberStatus(memberId: string, status: "ACTIVE" | "DISABLED") {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  if (memberId === auth.session.userId) {
    return { error: "You cannot disable your own owner account" };
  }

  const member = await prisma.user.findFirst({
    where: { id: memberId, orgId: auth.session.orgId },
  });
  if (!member) return { error: "Member not found" };
  if (member.role === "OWNER") {
    return { error: "The organization owner cannot be disabled" };
  }

  await prisma.user.update({
    where: { id: member.id },
    data: { status },
  });
  await prisma.activity.create({
    data: {
      orgId: auth.session.orgId,
      userId: auth.session.userId,
      action: status === "DISABLED" ? "MEMBER_DISABLED" : "MEMBER_ENABLED",
      details: { memberId: member.id, memberName: member.name, memberEmail: member.email },
    },
  });
  refresh();
  return { ok: true };
}

export async function joinWithCode(input: unknown) {
  const parsed = joinWithCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid join details" };
  }

  const joinCode = normalizeJoinCode(parsed.data.joinCode);
  const org = await prisma.organization.findUnique({ where: { joinCode } });
  if (!org) return { error: "That company code was not found" };

  const email = parsed.data.email.toLowerCase();
  if (await emailTaken(email)) {
    return { error: "An account with this email already exists" };
  }

  const user = await prisma.user.create({
    data: {
      orgId: org.id,
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "STAFF",
      status: "ACTIVE",
    },
  });
  await prisma.activity.create({
    data: {
      orgId: org.id,
      userId: user.id,
      action: "MEMBER_JOINED",
      details: { method: "join_code", memberName: user.name, memberEmail: user.email },
    },
  });
  await startStaffSession({
    userId: user.id,
    orgId: org.id,
    email: user.email,
    name: user.name,
    orgName: org.name,
  });
  return { ok: true, redirectTo: "/workspace" as const };
}

export async function joinWithToken(input: unknown) {
  const parsed = joinWithTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite details" };
  }

  const invite = await prisma.orgInvite.findUnique({
    where: { token: parsed.data.token },
    include: { org: true },
  });
  if (!invite || invite.usedAt) {
    return { error: "This invite is invalid or has already been used" };
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { error: "This invite has expired. Ask the owner for a new link or join code." };
  }

  const email = parsed.data.email.toLowerCase();
  if (invite.email && invite.email !== email) {
    return { error: "Use the email address this invite was created for" };
  }
  if (await emailTaken(email)) {
    return { error: "An account with this email already exists" };
  }

  const user = await prisma.user.create({
    data: {
      orgId: invite.orgId,
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "STAFF",
      status: "ACTIVE",
    },
  });
  await prisma.orgInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });
  await prisma.activity.create({
    data: {
      orgId: invite.orgId,
      userId: user.id,
      action: "MEMBER_JOINED",
      details: {
        method: "invite",
        memberName: user.name,
        memberEmail: user.email,
        inviteId: invite.id,
      },
    },
  });
  await startStaffSession({
    userId: user.id,
    orgId: invite.orgId,
    email: user.email,
    name: user.name,
    orgName: invite.org.name,
  });
  return { ok: true, redirectTo: "/workspace" as const };
}
