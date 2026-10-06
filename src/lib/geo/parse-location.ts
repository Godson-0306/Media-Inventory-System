import { NIGERIA_CENTER } from "@/lib/geo/config";
import { decodePlusCode, looksLikePlusCode } from "@/lib/geo/plus-code";

const COORD_PAIR =
  /^\s*([+-]?\d{1,2}(?:\.\d+)?)\s*[, ]\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/;

const ALLOWED_MAPS_HOSTS = new Set([
  "maps.google.com",
  "google.com",
  "www.google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "www.goo.gl",
]);

export function isMapsShortLink(url: URL) {
  const host = url.hostname.toLowerCase();
  return host === "maps.app.goo.gl" || host === "goo.gl" || host === "www.goo.gl";
}

export function isAllowedMapsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    return ALLOWED_MAPS_HOSTS.has(host) || host.endsWith(".google.com");
  } catch {
    return false;
  }
}

export function parseCoordinatePair(value: string) {
  const match = COORD_PAIR.exec(value.trim());
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function parseGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_MAPS_HOSTS.has(host) && !host.endsWith(".google.com")) return null;

    const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) {
      const latitude = Number(at[1]);
      const longitude = Number(at[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }

    const bang = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (bang) {
      const latitude = Number(bang[1]);
      const longitude = Number(bang[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }

    const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? "";
    const fromQuery = parseCoordinatePair(query);
    if (fromQuery) return fromQuery;

    const ll = url.searchParams.get("ll");
    if (ll) {
      const fromLl = parseCoordinatePair(ll);
      if (fromLl) return fromLl;
    }
  } catch {
    return null;
  }
  return null;
}

export function parsePastedLocation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { kind: "empty" as const };

  const coords = parseCoordinatePair(trimmed);
  if (coords) return { kind: "coords" as const, ...coords };

  if (looksLikePlusCode(trimmed)) {
    const decoded = decodePlusCode(
      trimmed,
      NIGERIA_CENTER.latitude,
      NIGERIA_CENTER.longitude,
    );
    if (decoded) return { kind: "pluscode" as const, ...decoded };
    return { kind: "invalid" as const, message: "That Plus Code could not be decoded." };
  }

  if (/^https?:\/\//i.test(trimmed) && isAllowedMapsUrl(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (isMapsShortLink(url)) {
        return { kind: "short-link" as const, url: trimmed };
      }
      const fromUrl = parseGoogleMapsUrl(trimmed);
      if (fromUrl) return { kind: "maps-url" as const, ...fromUrl };
      return {
        kind: "unresolved-link" as const,
        message:
          "That Maps link has no coordinates. Paste the full Google Maps URL or lat,lng instead.",
      };
    } catch {
      return { kind: "invalid" as const, message: "That link could not be read." };
    }
  }

  return { kind: "text" as const, query: trimmed };
}
