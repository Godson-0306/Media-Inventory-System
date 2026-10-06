import {
  RECENT_JOB_SITES_KEY,
  RECENT_JOB_SITES_LIMIT,
} from "@/lib/geo/config";

export type RecentJobSite = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  note?: string;
};

export function readRecentJobSites(): RecentJobSite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_JOB_SITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentJobSite[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude) &&
          typeof item.label === "string",
      )
      .slice(0, RECENT_JOB_SITES_LIMIT);
  } catch {
    return [];
  }
}

export function rememberJobSite(site: RecentJobSite) {
  if (typeof window === "undefined") return;
  const next = [
    site,
    ...readRecentJobSites().filter(
      (item) =>
        Math.abs(item.latitude - site.latitude) > 0.00015 ||
        Math.abs(item.longitude - site.longitude) > 0.00015,
    ),
  ].slice(0, RECENT_JOB_SITES_LIMIT);
  window.localStorage.setItem(RECENT_JOB_SITES_KEY, JSON.stringify(next));
}
