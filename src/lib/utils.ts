import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "org"}-${suffix}`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function actionLabel(action: string) {
  if (action === "SIGN_IN") return "Signed in";
  if (action === "SIGN_OUT") return "Signed out";
  if (action === "RETURN") return "Signed in";
  if (action === "REQUEST_CREATED") return "Request submitted";
  if (action === "REQUEST_APPROVED") return "Request accepted";
  if (action === "REQUEST_DECLINED") return "Request declined";
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function requestTypeLabel(type: string) {
  if (type === "SIGN_OUT") return "Check out";
  if (type === "SIGN_IN") return "Return";
  if (type === "RENTAL_OUT") return "Send on rental";
  return type.replaceAll("_", " ");
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDuration(start: Date | string, end: Date | string) {
  const from = typeof start === "string" ? new Date(start) : start;
  const to = typeof end === "string" ? new Date(end) : end;
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

export function formatRelativeTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatAgeLong(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function formatSinceWeekday(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  const ageMs = Date.now() - date.getTime();
  if (ageMs < 7 * 24 * 60 * 60 * 1000) {
    return `since ${date.toLocaleDateString(undefined, { weekday: "short" })}`;
  }
  return `since ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function holderFirstName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "Someone";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export type LocationFreshness =
  | { kind: "live" }
  | { kind: "recent"; label: string }
  | { kind: "stale"; label: string };

export function getLocationAgeMs(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  const ms = Date.now() - date.getTime();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

export function isLocationStale(
  liveUpdatedAt: Date | string | null | undefined,
  staleMs: number,
) {
  const age = getLocationAgeMs(liveUpdatedAt);
  return age !== null && age > staleMs;
}

export function getLocationFreshness(
  liveUpdatedAt: Date | string | null | undefined,
  freshMs: number,
  staleMs: number,
): LocationFreshness | null {
  const age = getLocationAgeMs(liveUpdatedAt);
  if (age === null) return null;
  if (age <= freshMs) return { kind: "live" };
  const relative = formatRelativeTime(liveUpdatedAt);
  if (age <= staleMs) {
    return { kind: "recent", label: `Last seen ${relative}` };
  }
  return { kind: "stale", label: `Stale · ${formatAgeLong(liveUpdatedAt!)}` };
}
