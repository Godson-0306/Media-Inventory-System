"use server";

import { prisma } from "@/lib/db";
import { requireActiveOrg, requireOwner } from "@/lib/authz";
import {
  applyApprovedRentalOut,
  applyApprovedSignIn,
  applyApprovedSignOut,
} from "@/actions/operations";
import { refresh } from "@/lib/revalidate";
import { resolveOrgMember } from "@/lib/members";
import { declineRequestSchema, rentalOutRequestSchema } from "@/lib/validations";

async function pendingRequestFor(orgId: string, equipmentId: string) {
  return prisma.operationRequest.findFirst({
    where: { orgId, equipmentId, status: "PENDING" },
  });
}

export async function requestRentalOut(input: unknown) {
  const auth = await requireActiveOrg();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = rentalOutRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rental details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };
  if (item.status !== "ACTIVE" && item.status !== "SIGNED_IN") {
    return { error: "Only active or signed-in equipment can be requested for rental" };
  }
  if (await pendingRequestFor(session.orgId, item.id)) {
    return { error: "This asset already has a pending request" };
  }

  const operator = await resolveOrgMember(session.orgId, parsed.data.operatorUserId);
  if (operator.error || !operator.member) return { error: operator.error ?? "Select a member" };

  await prisma.operationRequest.create({
    data: {
      orgId: session.orgId,
      equipmentId: item.id,
      requesterId: session.userId,
      operatorUserId: operator.member.id,
      type: "RENTAL_OUT",
      operatorName: operator.member.name,
      notes: parsed.data.notes ?? "",
      counterparty: parsed.data.counterparty,
      startDate: new Date(),
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: item.id,
      action: "REQUEST_CREATED",
      details: {
        requestType: "RENTAL_OUT",
        operatorName: operator.member.name,
        operatorUserId: operator.member.id,
        counterparty: parsed.data.counterparty,
        notes: parsed.data.notes ?? "",
      },
    },
  });
  refresh(item.id);
  return { ok: true };
}

export async function cancelOperationRequest(requestId: string) {
  const auth = await requireActiveOrg();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const request = await prisma.operationRequest.findFirst({
    where: { id: requestId, orgId: session.orgId },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "This request is no longer pending" };
  if (request.requesterId !== session.userId) {
    return { error: "Only the person who submitted this request can cancel it" };
  }

  const now = new Date();
  await prisma.operationRequest.update({
    where: { id: request.id },
    data: {
      status: "DECLINED",
      reviewedByUserId: session.userId,
      reviewedAt: now,
      declineReason: "Cancelled by requester",
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: request.equipmentId,
      action: "REQUEST_DECLINED",
      details: {
        requestType: request.type,
        requestId: request.id,
        declineReason: "Cancelled by requester",
      },
    },
  });
  refresh(request.equipmentId);
  return { ok: true };
}

export async function approveOperationRequest(requestId: string) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;

  const request = await prisma.operationRequest.findFirst({
    where: { id: requestId, orgId: session.orgId },
    include: { equipment: true },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "This request is no longer pending" };

  const item = request.equipment;
  if (request.type === "SIGN_OUT") {
    if (item.status !== "ACTIVE" && item.status !== "SIGNED_IN") {
      return { error: "This asset can no longer be signed out" };
    }
    if (request.latitude == null || request.longitude == null || !request.locationLabel) {
      return { error: "This sign-out request is missing a destination" };
    }
    await applyApprovedSignOut({
      orgId: session.orgId,
      actorUserId: session.userId,
      operatorUserId: request.operatorUserId ?? request.requesterId,
      item,
      operatorName: request.operatorName,
      notes: request.notes,
      locationLabel: request.locationLabel,
      locationAddress: request.locationAddress ?? "",
      latitude: request.latitude,
      longitude: request.longitude,
    });
  } else if (request.type === "SIGN_IN") {
    if (item.status !== "SIGNED_OUT") {
      return { error: "This asset is not currently signed out" };
    }
    await applyApprovedSignIn({
      orgId: session.orgId,
      actorUserId: session.userId,
      item,
      operatorName: request.operatorName,
      notes: request.notes,
    });
  } else {
    if (item.status !== "ACTIVE" && item.status !== "SIGNED_IN") {
      return { error: "This asset can no longer be sent on rental" };
    }
    if (!request.counterparty) {
      return { error: "This rental request is missing a client or event" };
    }
    await applyApprovedRentalOut({
      orgId: session.orgId,
      actorUserId: session.userId,
      operatorUserId: request.operatorUserId ?? request.requesterId,
      item,
      operatorName: request.operatorName,
      notes: request.notes,
      counterparty: request.counterparty,
      startDate: request.startDate ?? new Date(),
    });
  }

  await prisma.operationRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: request.equipmentId,
      action: "REQUEST_APPROVED",
      details: {
        requestType: request.type,
        requestId: request.id,
        operatorName: request.operatorName,
      },
    },
  });
  refresh(request.equipmentId);
  return { ok: true };
}

export async function declineOperationRequest(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = declineRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const request = await prisma.operationRequest.findFirst({
    where: { id: parsed.data.requestId, orgId: session.orgId },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "This request is no longer pending" };

  await prisma.operationRequest.update({
    where: { id: request.id },
    data: {
      status: "DECLINED",
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
      declineReason: parsed.data.declineReason?.trim() || null,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: request.equipmentId,
      action: "REQUEST_DECLINED",
      details: {
        requestType: request.type,
        requestId: request.id,
        declineReason: parsed.data.declineReason?.trim() || null,
      },
    },
  });
  refresh(request.equipmentId);
  return { ok: true };
}
