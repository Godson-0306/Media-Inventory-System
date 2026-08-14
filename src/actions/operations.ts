"use server";

import { prisma } from "@/lib/db";
import { requireActiveOrg } from "@/lib/authz";
import {
  CLEAR_LIVE_LOCATION,
  HOME_LOCATION,
  LIVE_PING_MIN_INTERVAL_MS,
  LIVE_PING_TRAIL_LIMIT,
} from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import {
  faultSchema,
  liveLocationSchema,
  operationSchema,
  signOutSchema,
} from "@/lib/validations";
import type { Equipment } from "@prisma/client";
import { refresh } from "@/lib/revalidate";
import { resolveOrgMember } from "@/lib/members";

async function pendingRequestFor(orgId: string, equipmentId: string) {
  return prisma.operationRequest.findFirst({
    where: { orgId, equipmentId, status: "PENDING" },
  });
}

export async function signOutEquipment(input: unknown) {
  const auth = await requireActiveOrg();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = signOutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };
  if (item.status !== "ACTIVE" && item.status !== "SIGNED_IN") {
    return { error: "Only active or signed-in equipment can be requested for sign-out" };
  }
  if (await pendingRequestFor(session.orgId, item.id)) {
    return { error: "This asset already has a pending request" };
  }

  const operator = await resolveOrgMember(session.orgId, parsed.data.operatorUserId);
  if (operator.error || !operator.member) return { error: operator.error ?? "Select a member" };

  const location = await prisma.orgLocation.findFirst({
    where: { id: parsed.data.locationId, orgId: session.orgId },
  });
  if (!location) return { error: "Select a saved destination" };

  await prisma.operationRequest.create({
    data: {
      orgId: session.orgId,
      equipmentId: item.id,
      requesterId: session.userId,
      operatorUserId: operator.member.id,
      type: "SIGN_OUT",
      operatorName: operator.member.name,
      notes: parsed.data.notes ?? "",
      locationLabel: location.name,
      locationAddress: location.address ?? "",
      latitude: location.latitude,
      longitude: location.longitude,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: item.id,
      action: "REQUEST_CREATED",
      details: {
        requestType: "SIGN_OUT",
        operatorName: operator.member.name,
        operatorUserId: operator.member.id,
        notes: parsed.data.notes ?? "",
        place: location.name,
        address: location.address ?? "",
        lat: location.latitude,
        lng: location.longitude,
      },
    },
  });
  refresh(item.id);
  return { ok: true };
}

export async function signInEquipment(input: unknown) {
  const auth = await requireActiveOrg();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };
  if (item.status !== "SIGNED_OUT") {
    return { error: "This asset is not currently signed out" };
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
      type: "SIGN_IN",
      operatorName: operator.member.name,
      notes: parsed.data.notes ?? "",
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: item.id,
      action: "REQUEST_CREATED",
      details: {
        requestType: "SIGN_IN",
        operatorName: operator.member.name,
        operatorUserId: operator.member.id,
        notes: parsed.data.notes ?? "",
      },
    },
  });
  refresh(item.id);
  return { ok: true };
}

export async function applyApprovedSignOut(input: {
  orgId: string;
  actorUserId: string;
  operatorUserId: string;
  item: Equipment;
  operatorName: string;
  notes: string;
  locationLabel: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
}) {
  const now = new Date();
  await prisma.equipment.update({
    where: { id: input.item.id },
    data: {
      status: "SIGNED_OUT",
      currentOperator: input.operatorName,
      useCount: { increment: 1 },
      signedOutAt: now,
      locationLabel: input.locationLabel,
      locationAddress: input.locationAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      ...CLEAR_LIVE_LOCATION,
      signedOutByUserId: input.operatorUserId,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: input.orgId,
      userId: input.actorUserId,
      equipmentId: input.item.id,
      action: "SIGN_OUT",
      details: {
        operatorName: input.operatorName,
        notes: input.notes,
        place: input.locationLabel,
        address: input.locationAddress,
        lat: input.latitude,
        lng: input.longitude,
      },
    },
  });
}

export async function applyApprovedSignIn(input: {
  orgId: string;
  actorUserId: string;
  item: Equipment;
  operatorName: string;
  notes: string;
}) {
  const now = new Date();
  const duration = input.item.signedOutAt
    ? formatDuration(input.item.signedOutAt, now)
    : null;

  await prisma.equipment.update({
    where: { id: input.item.id },
    data: {
      status: "SIGNED_IN",
      currentOperator: null,
      signedOutAt: null,
      locationLabel: HOME_LOCATION.label,
      locationAddress: HOME_LOCATION.address,
      latitude: null,
      longitude: null,
      ...CLEAR_LIVE_LOCATION,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: input.orgId,
      userId: input.actorUserId,
      equipmentId: input.item.id,
      action: "SIGN_IN",
      details: {
        operatorName: input.operatorName,
        notes: input.notes,
        place: HOME_LOCATION.label,
        duration,
      },
    },
  });
}

export async function applyApprovedRentalOut(input: {
  orgId: string;
  actorUserId: string;
  operatorUserId: string;
  item: Equipment;
  operatorName: string;
  notes: string;
  counterparty: string;
  startDate: Date;
}) {
  const rental = await prisma.rental.create({
    data: {
      orgId: input.orgId,
      equipmentId: input.item.id,
      type: "OUT",
      counterparty: input.counterparty,
      startDate: input.startDate,
      notes: input.notes,
    },
  });
  await prisma.equipment.update({
    where: { id: input.item.id },
    data: {
      status: "SIGNED_OUT",
      currentOperator: input.operatorName,
      signedOutAt: new Date(),
      signedOutByUserId: input.operatorUserId,
      liveLatitude: null,
      liveLongitude: null,
      liveAccuracy: null,
      liveUpdatedAt: null,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: input.orgId,
      userId: input.actorUserId,
      equipmentId: input.item.id,
      action: "RENTAL_CREATED",
      details: {
        type: "OUT",
        counterparty: input.counterparty,
        rentalId: rental.id,
        operatorName: input.operatorName,
      },
    },
  });
}

export async function reportFault(input: unknown) {
  const auth = await requireActiveOrg();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = faultSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };

  const operator = await resolveOrgMember(session.orgId, parsed.data.operatorUserId);
  if (operator.error || !operator.member) return { error: operator.error ?? "Select a member" };

  await prisma.$transaction([
    prisma.equipment.update({
      where: { id: item.id },
      data: {
        status: "FAULTY",
        currentOperator: operator.member.name,
        signedOutAt: null,
        ...CLEAR_LIVE_LOCATION,
      },
    }),
    prisma.fault.create({
      data: {
        orgId: session.orgId,
        equipmentId: item.id,
        reporterId: session.userId,
        description: parsed.data.description,
      },
    }),
    prisma.activity.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        equipmentId: item.id,
        action: "FAULT_REPORTED",
        details: {
          operatorName: operator.member.name,
          operatorUserId: operator.member.id,
          description: parsed.data.description,
        },
      },
    }),
  ]);
  refresh(item.id);
  return { ok: true };
}

export async function updateLiveLocation(input: unknown) {
  const auth = await requireActiveOrg();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = liveLocationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid location" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };
  if (item.status !== "SIGNED_OUT") {
    return { error: "Live location is only shared while this asset is signed out" };
  }
  if (item.signedOutByUserId !== session.userId) {
    return { error: "Only the operator who signed this out can share live location" };
  }

  const now = new Date();
  if (
    item.liveUpdatedAt &&
    now.getTime() - item.liveUpdatedAt.getTime() < LIVE_PING_MIN_INTERVAL_MS
  ) {
    return { ok: true, skipped: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipment.update({
      where: { id: item.id },
      data: {
        liveLatitude: parsed.data.latitude,
        liveLongitude: parsed.data.longitude,
        liveAccuracy: parsed.data.accuracy ?? null,
        liveUpdatedAt: now,
      },
    });
    await tx.locationPing.create({
      data: {
        orgId: session.orgId,
        equipmentId: item.id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        accuracy: parsed.data.accuracy ?? null,
      },
    });
    const extra = await tx.locationPing.findMany({
      where: { equipmentId: item.id },
      orderBy: { createdAt: "desc" },
      skip: LIVE_PING_TRAIL_LIMIT,
      select: { id: true },
    });
    if (extra.length > 0) {
      await tx.locationPing.deleteMany({
        where: { id: { in: extra.map((ping) => ping.id) } },
      });
    }
  });

  return { ok: true };
}
