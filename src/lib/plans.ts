import type { SubscriptionPlan } from "@prisma/client";

export type PlanId = "STARTER" | "STUDIO" | "ENTERPRISE";

export type PlanLimits = {
  id: PlanId;
  name: string;
  priceNgn: number;
  maxItems: number | null;
  maxLocations: number | null;
  branding: boolean;
  blurb: string;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceNgn: 10_000,
    maxItems: 25,
    maxLocations: 1,
    branding: false,
    blurb: "One storage site and a compact kit list for a single operation.",
  },
  STUDIO: {
    id: "STUDIO",
    name: "Studio",
    priceNgn: 30_000,
    maxItems: 100,
    maxLocations: 5,
    branding: false,
    blurb: "More kit and up to five named sites for a growing production team.",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceNgn: 80_000,
    maxItems: null,
    maxLocations: null,
    branding: true,
    blurb: "Unlimited items and locations, plus a custom organization interface.",
  },
};

export const PLAN_ORDER: PlanId[] = ["STARTER", "STUDIO", "ENTERPRISE"];

export function asPlanId(value: SubscriptionPlan | string | null | undefined): PlanId {
  if (value === "STUDIO" || value === "ENTERPRISE" || value === "STARTER") return value;
  return "STARTER";
}

export function planLimits(plan: SubscriptionPlan | string | null | undefined) {
  return PLAN_LIMITS[asPlanId(plan)];
}

export function hasCustomInterface(plan: SubscriptionPlan | string | null | undefined) {
  return asPlanId(plan) === "ENTERPRISE";
}

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatCap(used: number, max: number | null, unit: string) {
  if (max == null) return `${used} ${unit} (unlimited)`;
  return `${used} / ${max} ${unit}`;
}

export function capReached(used: number, max: number | null) {
  return max != null && used >= max;
}
