import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const unlockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const equipmentSchema = z.object({
  name: z.string().trim().min(2, "Equipment name is required"),
  serialNumber: z.string().trim().min(2, "Serial number is required"),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  category: z.enum([
    "AUDIO",
    "CABLES",
    "CAMERAS",
    "COMPUTING",
    "DISPLAYS",
    "LIGHTING",
    "OTHERS",
  ]),
  purchaseDate: z.string().optional(),
  warrantyDate: z.string().optional(),
  conditionNotes: z.string().optional(),
});

export const operationSchema = z.object({
  equipmentId: z.string().min(1),
  operatorName: z.string().trim().min(2, "Operator name is required"),
  notes: z.string().optional(),
});

export const faultSchema = z.object({
  equipmentId: z.string().min(1),
  operatorName: z.string().trim().min(2, "Operator name is required"),
  description: z.string().trim().min(4, "Describe the fault"),
});

export const rentalSchema = z.object({
  equipmentId: z.string().optional(),
  type: z.enum(["IN", "OUT"]),
  counterparty: z.string().trim().min(2, "Counterparty is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
  });
