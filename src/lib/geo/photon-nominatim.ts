import type { PlaceHit, PlaceSearchHit } from "@/lib/types";
import {
  GEO_FETCH_TIMEOUT_MS,
  GEO_SEARCH_LIMIT,
  GEO_USER_AGENT,
  NIGERIA_BBOX,
  NIGERIA_CENTER,
  NOMINATIM_BASE_URL,
  NOMINATIM_MIN_INTERVAL_MS,
  PHOTON_BASE_URL,
} from "@/lib/geo/config";
import type { GeocodingProvider } from "@/lib/geo/provider";
import { isAllowedMapsUrl, isMapsShortLink, parseGoogleMapsUrl } from "@/lib/geo/parse-location";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    district?: string;
    locality?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

type NominatimHit = {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

const searchCache = new Map<string, PlaceSearchHit[]>();
const reverseCache = new Map<string, PlaceHit>();
let nominatimChain = Promise.resolve();
let lastNominatimAt = 0;

function geoHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": GEO_USER_AGENT,
  };
}

function timeoutSignal(parent?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEO_FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  parent?.addEventListener("abort", onAbort, { once: true });
  if (parent?.aborted) controller.abort();
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onAbort);
    },
  };
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timed = timeoutSignal(signal);
  try {
    const response = await fetch(url, {
      headers: geoHeaders(),
      cache: "no-store",
      signal: timed.signal,
    });
    if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
    return (await response.json()) as T;
  } finally {
    timed.dispose();
  }
}

function enqueueNominatim<T>(run: () => Promise<T>) {
  const next = nominatimChain.then(async () => {
    const wait = NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastNominatimAt = Date.now();
    return run();
  });
  nominatimChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function formatCoordLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function featureToPlace(feature: PhotonFeature): PlaceSearchHit | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const props = feature.properties ?? {};
  const street = [props.housenumber, props.street].filter(Boolean).join(" ");
  const label = props.name || street || props.locality || props.city || "Place";
  const secondary = [props.district || street, props.city, props.state, props.country]
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index && part !== label);
  return {
    label,
    address: secondary.join(", ") || label,
    latitude,
    longitude,
  };
}

function nominatimToPlace(hit: NominatimHit): PlaceSearchHit | null {
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const addr = hit.address ?? {};
  const locality = addr.city || addr.town || addr.village;
  const label = hit.name || addr.road || locality || "Place";
  const secondary = [addr.suburb || addr.road, locality, addr.state, addr.country]
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index && part !== label);
  return {
    label,
    address: secondary.join(", ") || hit.display_name || label,
    latitude,
    longitude,
  };
}

function asPlaceHit(hit: PlaceSearchHit, latitude: number, longitude: number): PlaceHit {
  return {
    label: hit.label,
    address: hit.address,
    latitude,
    longitude,
    placeId: hit.placeId,
  };
}

function reverseLabel(hit: PlaceSearchHit) {
  const parts = [hit.label, hit.address]
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index);
  const combined = parts.join(", ");
  return combined.length > 80 ? hit.label : combined || hit.label;
}

async function photonSearch(query: string, local: boolean, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q: query,
    limit: String(GEO_SEARCH_LIMIT),
    lat: String(NIGERIA_CENTER.latitude),
    lon: String(NIGERIA_CENTER.longitude),
    lang: "en",
  });
  if (local) {
    params.set(
      "bbox",
      `${NIGERIA_BBOX.minLon},${NIGERIA_BBOX.minLat},${NIGERIA_BBOX.maxLon},${NIGERIA_BBOX.maxLat}`,
    );
  }
  const data = await fetchJson<PhotonResponse>(`${PHOTON_BASE_URL}/api/?${params}`, signal);
  return (data.features ?? [])
    .map(featureToPlace)
    .filter((item): item is PlaceSearchHit => item !== null);
}

async function nominatimSearch(query: string, nigeriaOnly: boolean, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(GEO_SEARCH_LIMIT),
    "accept-language": "en",
  });
  if (nigeriaOnly) params.set("countrycodes", "ng");
  return enqueueNominatim(async () => {
    const data = await fetchJson<NominatimHit[]>(
      `${NOMINATIM_BASE_URL}/search?${params}`,
      signal,
    );
    return data
      .map(nominatimToPlace)
      .filter((item): item is PlaceSearchHit => item !== null);
  });
}

async function photonReverse(latitude: number, longitude: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  const data = await fetchJson<PhotonResponse>(`${PHOTON_BASE_URL}/reverse?${params}`, signal);
  const hit = data.features?.[0] ? featureToPlace(data.features[0]) : null;
  if (!hit) return null;
  return asPlaceHit({ ...hit, label: reverseLabel(hit) }, latitude, longitude);
}

async function nominatimReverse(latitude: number, longitude: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "en",
  });
  return enqueueNominatim(async () => {
    const hit = await fetchJson<NominatimHit>(`${NOMINATIM_BASE_URL}/reverse?${params}`, signal);
    const place = nominatimToPlace(hit);
    if (!place) return null;
    return asPlaceHit({ ...place, label: reverseLabel(place) }, latitude, longitude);
  });
}

export const photonNominatimProvider: GeocodingProvider = {
  async searchPlaces(query, signal) {
    const q = query.trim();
    const cacheKey = q.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    let results: PlaceSearchHit[] = [];
    try {
      results = await photonSearch(q, true, signal);
      if (results.length === 0) results = await photonSearch(q, false, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      results = [];
    }
    if (results.length === 0) {
      try {
        results = await nominatimSearch(q, true, signal);
        if (results.length === 0) results = await nominatimSearch(q, false, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        results = [];
      }
    }
    searchCache.set(cacheKey, results);
    return results;
  },

  async reverseGeocode(latitude, longitude, signal) {
    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cached = reverseCache.get(key);
    if (cached) return cached;
    let place: PlaceHit | null = null;
    try {
      place = await photonReverse(latitude, longitude, signal);
    } catch {
      place = null;
    }
    if (!place) {
      try {
        place = await nominatimReverse(latitude, longitude, signal);
      } catch {
        place = null;
      }
    }
    const resolved =
      place ??
      ({
        label: formatCoordLabel(latitude, longitude),
        address: formatCoordLabel(latitude, longitude),
        latitude,
        longitude,
      } satisfies PlaceHit);
    reverseCache.set(key, resolved);
    return resolved;
  },
};

export async function resolveMapsShortLink(url: string, signal?: AbortSignal): Promise<PlaceHit | null> {
  if (!isAllowedMapsUrl(url)) return null;
  const parsed = new URL(url);
  if (!isMapsShortLink(parsed)) {
    const coords = parseGoogleMapsUrl(url);
    if (!coords) return null;
    return photonNominatimProvider.reverseGeocode(coords.latitude, coords.longitude, signal);
  }
  const timed = timeoutSignal(signal);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": GEO_USER_AGENT, Accept: "text/html" },
      signal: timed.signal,
      cache: "no-store",
    });
    const finalUrl = response.url || url;
    const coords = parseGoogleMapsUrl(finalUrl);
    if (!coords) return null;
    return photonNominatimProvider.reverseGeocode(coords.latitude, coords.longitude, signal);
  } finally {
    timed.dispose();
  }
}

export const searchPlaces = photonNominatimProvider.searchPlaces.bind(photonNominatimProvider);
export const reverseGeocode = photonNominatimProvider.reverseGeocode.bind(photonNominatimProvider);
