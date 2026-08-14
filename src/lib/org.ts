import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { INVITE_MAX_AGE_DAYS, TRIAL_DAYS } from "@/lib/constants";
import type { SubscriptionStatus } from "@prisma/client";

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let backfilledRoles = false;

export async function ensureAuthBackfill() {
  if (backfilledRoles) return;
  backfilledRoles = true;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET role = 'STAFF' WHERE role = 'OPERATOR'`,
    );
  } catch {
    backfilledRoles = false;
  }
}

export function trialEndsAtFromNow() {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
}

export function generateJoinCode() {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) {
    code += JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeJoinCode(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function generateInviteToken() {
  return randomBytes(24).toString("hex");
}

export function isOrgActive(org: {
  subscriptionStatus: SubscriptionStatus | string;
  trialEndsAt: Date | string | null;
}) {
  if (org.subscriptionStatus === "ACTIVE") return true;
  if (org.subscriptionStatus === "TRIAL") {
    if (!org.trialEndsAt) return true;
    const ends =
      typeof org.trialEndsAt === "string" ? new Date(org.trialEndsAt) : org.trialEndsAt;
    return ends.getTime() > Date.now();
  }
  return false;
}

export async function allocateJoinCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const joinCode = generateJoinCode();
    const existing = await prisma.organization.findUnique({ where: { joinCode } });
    if (!existing) return joinCode;
  }
  return `${generateJoinCode()}${randomBytes(2).toString("hex").toUpperCase().slice(0, 2)}`;
}

export async function ensureOrgDefaults(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return null;
  const data: { joinCode?: string; trialEndsAt?: Date } = {};
  if (!org.joinCode) data.joinCode = await allocateJoinCode();
  if (!org.trialEndsAt && org.subscriptionStatus === "TRIAL") {
    data.trialEndsAt = trialEndsAtFromNow();
  }
  if (Object.keys(data).length === 0) return org;
  return prisma.organization.update({ where: { id: org.id }, data });
}
