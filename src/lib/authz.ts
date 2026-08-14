import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, type SessionPayload, type UserRoleValue } from "@/lib/auth";
import { ensureAuthBackfill, ensureOrgDefaults, isOrgActive, resolveBranding, type OrgBranding } from "@/lib/org";
import { asPlanId, type PlanId } from "@/lib/plans";
import type { SubscriptionStatus, UserStatus } from "@prisma/client";

export type LiveSession = SessionPayload & {
  userStatus: UserStatus;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  joinCode: string | null;
  plan: PlanId;
  branding: OrgBranding | null;
};

export type AuthResult =
  | { ok: true; session: LiveSession }
  | { ok: false; error: string };

export async function getLiveSession(): Promise<LiveSession | null> {
  const cookieSession = await getSession();
  if (!cookieSession) return null;
  await ensureAuthBackfill();
  const user = await prisma.user.findFirst({
    where: { id: cookieSession.userId },
    include: { org: true },
  });
  if (!user || user.status === "DISABLED") return null;
  const org = (await ensureOrgDefaults(user.orgId)) ?? user.org;
  const branding = resolveBranding(org);
  return {
    userId: user.id,
    orgId: user.orgId,
    email: user.email,
    name: user.name,
    role: user.role === "OWNER" ? "OWNER" : "STAFF",
    orgName: branding?.brandName ?? org.name,
    userStatus: user.status,
    subscriptionStatus: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt,
    joinCode: org.joinCode,
    plan: asPlanId(org.plan),
    branding,
  };
}

export async function requireSession(): Promise<AuthResult> {
  const session = await getLiveSession();
  if (!session) {
    return { ok: false, error: "Sign in to continue" };
  }
  return { ok: true, session };
}

export async function requireActiveOrg(): Promise<AuthResult> {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  if (!isOrgActive(auth.session)) {
    return { ok: false, error: "Company access is paused. Ask the owner to renew access." };
  }
  return auth;
}

export const requireStaffOrOwner = requireActiveOrg;

export async function requireOwner(): Promise<AuthResult> {
  const auth = await requireActiveOrg();
  if (!auth.ok) return auth;
  if (auth.session.role !== "OWNER") {
    return { ok: false, error: "Only the organization owner can do this" };
  }
  return auth;
}

export async function requireActiveOrgPage() {
  const session = await getLiveSession();
  if (!session) redirect("/");
  if (!isOrgActive(session)) redirect("/org/billing");
  return session;
}

export async function requireOwnerPage() {
  const session = await requireActiveOrgPage();
  if (session.role !== "OWNER") redirect("/workspace");
  return session;
}

export async function requireSignedInPage() {
  const session = await getLiveSession();
  if (!session) redirect("/");
  return session;
}

export function isOwner(role: UserRoleValue) {
  return role === "OWNER";
}
