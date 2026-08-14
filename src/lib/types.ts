export type EquipmentStatusValue = "ACTIVE" | "SIGNED_OUT" | "SIGNED_IN" | "FAULTY";

export type EquipmentDTO = {
  id: string;
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  category: string;
  status: EquipmentStatusValue;
  currentOperator: string | null;
  useCount: number;
  conditionNotes: string;
  signedOutAt: string | null;
  locationLabel: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  signedOutByUserId: string | null;
  liveLatitude: number | null;
  liveLongitude: number | null;
  liveAccuracy: number | null;
  liveUpdatedAt: string | null;
  purchaseDate: string | null;
  warrantyDate: string | null;
};

export type ActivityDTO = {
  id: string;
  action: string;
  createdAt: string;
  details: Record<string, unknown> | null;
  userName: string | null;
  equipmentName: string | null;
};

export type RentalDTO = {
  id: string;
  type: "IN" | "OUT";
  status: "ACTIVE" | "RETURNED" | "CANCELLED";
  counterparty: string;
  startDate: string;
  endDate: string | null;
  notes: string;
  equipmentName: string | null;
  equipmentId: string | null;
};

export type FaultDTO = {
  id: string;
  status: "OPEN" | "IN_REPAIR" | "RESOLVED";
  description: string;
  reportedAt: string;
  resolvedAt: string | null;
  equipmentName: string;
  equipmentId: string;
  reporterName: string;
};

export type Counts = {
  total: number;
  active: number;
  signedOut: number;
  signedIn: number;
  faulty: number;
  rentalsIn: number;
  rentalsOut: number;
  openFaults: number;
  pendingRequests: number;
};

export type PlaceHit = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type TimelineEvent = {
  id: string;
  action: string;
  createdAt: string;
  summary: string;
  userName: string | null;
  place: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type LocationPingDTO = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  createdAt: string;
};

export type MemberDTO = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
};

export type OrgInviteDTO = {
  id: string;
  token: string;
  email: string | null;
  expiresAt: string;
  createdAt: string;
};

export type OperationRequestType = "SIGN_OUT" | "SIGN_IN" | "RENTAL_OUT";
export type OperationRequestStatus = "PENDING" | "APPROVED" | "DECLINED";

export type OperationRequestDTO = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  serialNumber: string;
  type: OperationRequestType;
  status: OperationRequestStatus;
  operatorName: string;
  operatorUserId: string | null;
  notes: string;
  locationLabel: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  counterparty: string | null;
  startDate: string | null;
  requesterId: string;
  requesterName: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  declineReason: string | null;
  createdAt: string;
};
