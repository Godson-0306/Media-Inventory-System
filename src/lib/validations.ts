import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required").max(80),
  ownerName: z.string().trim().min(2, "Your name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  orgSlug: z.string().trim().max(80).optional(),
});

export const memberInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.union([z.literal(""), z.string().email("Enter a valid email")])),
});

export const joinWithCodeSchema = z.object({
  joinCode: z.string().trim().min(8, "Enter the company join code"),
  name: z.string().trim().min(2, "Your name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const joinWithTokenSchema = z.object({
  token: z.string().min(8),
  name: z.string().trim().min(2, "Your name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

export const equipmentUpdateSchema = equipmentSchema.extend({
  id: z.string().min(1),
});

export const equipmentIdSchema = z.object({
  id: z.string().min(1),
});

export const operationSchema = z.object({
  equipmentId: z.string().min(1),
  operatorUserId: z.string().min(1, "Select the member taking this kit"),
  notes: z.string().optional(),
});

export const signOutSchema = operationSchema.extend({
  locationId: z.string().min(1, "Select a destination"),
});

export const liveLocationSchema = z.object({
  equipmentId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
});

export const faultSchema = z.object({
  equipmentId: z.string().min(1),
  operatorUserId: z.string().min(1, "Select the member reporting this fault"),
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

export const rentalOutRequestSchema = z.object({
  equipmentId: z.string().min(1),
  operatorUserId: z.string().min(1, "Select the member taking this kit"),
  counterparty: z.string().trim().min(2, "Counterparty is required"),
  notes: z.string().optional(),
});

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Member name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
});

export const declineRequestSchema = z.object({
  requestId: z.string().min(1),
  declineReason: z.string().trim().max(400).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Location name is required").max(80),
  address: z.string().trim().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const locationUpdateSchema = locationSchema.extend({
  id: z.string().min(1),
});

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\//i.test(value), "Enter a valid image URL");

export const appearanceSchema = z.object({
  brandName: z.string().trim().max(80).optional(),
  logoUrl: optionalUrl.optional(),
  accentColor: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^#[0-9A-Fa-f]{6}$/.test(value),
      "Use a hex color like #3b82f6",
    )
    .optional(),
  loginHeadline: z.string().trim().max(120).optional(),
  loginTagline: z.string().trim().max(200).optional(),
});
