export type EquipmentDTO = {
  id: string;
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  category: string;
  status: "AVAILABLE" | "IN_USE" | "FAULTY" | "RENTED_OUT";
  currentOperator: string | null;
  useCount: number;
  conditionNotes: string;
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
  available: number;
  inUse: number;
  faulty: number;
  rentedOut: number;
  rentalsIn: number;
  rentalsOut: number;
  openFaults: number;
};
