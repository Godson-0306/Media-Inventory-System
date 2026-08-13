import type { PlaceHit } from "@/lib/types";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

function featureToPlace(feature: PhotonFeature): PlaceHit | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const props = feature.properties ?? {};
  const parts = [props.street, props.city, props.state, props.country].filter(Boolean);
  const address = parts.join(", ");
  const label = props.name || props.city || address || "Dropped pin";
  return {
    label,
    address: address || label,
    latitude,
    longitude,
  };
}

async function photon(path: string) {
  const response = await fetch(`https://photon.komoot.io${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error("Place lookup failed");
  }
  return (await response.json()) as PhotonResponse;
}

export async function searchPlaces(query: string): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await photon(`/api/?q=${encodeURIComponent(q)}&limit=6`);
  return (data.features ?? [])
    .map(featureToPlace)
    .filter((item): item is PlaceHit => item !== null);
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<PlaceHit> {
  try {
    const data = await photon(`/reverse?lat=${latitude}&lon=${longitude}`);
    const hit = data.features?.[0] ? featureToPlace(data.features[0]) : null;
    if (hit) return hit;
  } catch {
    // Fall through to a coordinate label if reverse lookup is unavailable.
  }
  return {
    label: "Dropped pin",
    address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude,
    longitude,
  };
}
