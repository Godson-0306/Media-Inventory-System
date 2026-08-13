import type { Equipment, OperationRequest, User } from "@prisma/client";
import type { EquipmentDTO, OperationRequestDTO } from "@/lib/types";

export function toEquipmentDTO(item: Equipment): EquipmentDTO {
  return {
    id: item.id,
    name: item.name,
    serialNumber: item.serialNumber,
    brand: item.brand,
    model: item.model,
    category: item.category,
    status: item.status,
    currentOperator: item.currentOperator,
    useCount: item.useCount,
    conditionNotes: item.conditionNotes,
    signedOutAt: item.signedOutAt?.toISOString() ?? null,
    locationLabel: item.locationLabel,
    locationAddress: item.locationAddress,
    latitude: item.latitude,
    longitude: item.longitude,
    signedOutByUserId: item.signedOutByUserId,
    liveLatitude: item.liveLatitude,
    liveLongitude: item.liveLongitude,
    liveAccuracy: item.liveAccuracy,
    liveUpdatedAt: item.liveUpdatedAt?.toISOString() ?? null,
    purchaseDate: item.purchaseDate?.toISOString() ?? null,
    warrantyDate: item.warrantyDate?.toISOString() ?? null,
  };
}

export function toOperationRequestDTO(
  item: OperationRequest & {
    equipment: Pick<Equipment, "name" | "serialNumber">;
    requester: Pick<User, "name">;
    reviewedBy: Pick<User, "name"> | null;
  },
): OperationRequestDTO {
  return {
    id: item.id,
    equipmentId: item.equipmentId,
    equipmentName: item.equipment.name,
    serialNumber: item.equipment.serialNumber,
    type: item.type,
    status: item.status,
    operatorName: item.operatorName,
    operatorUserId: item.operatorUserId,
    notes: item.notes,
    locationLabel: item.locationLabel,
    locationAddress: item.locationAddress,
    latitude: item.latitude,
    longitude: item.longitude,
    counterparty: item.counterparty,
    startDate: item.startDate?.toISOString() ?? null,
    requesterId: item.requesterId,
    requesterName: item.requester.name,
    reviewedByName: item.reviewedBy?.name ?? null,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    declineReason: item.declineReason,
    createdAt: item.createdAt.toISOString(),
  };
}
