import type { PlaceHit, PlaceSearchHit } from "@/lib/types";

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

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
};

type GooglePlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

type GoogleTextSearchResponse = {
  places?: GooglePlaceDetails[];
};

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1";

function googleKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() ?? "";
}

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

function toPlaceHit(place: GooglePlaceDetails): PlaceHit | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const label = place.displayName?.text || place.formattedAddress || "Place";
  return {
    label,
    address: place.formattedAddress || label,
    latitude: latitude as number,
    longitude: longitude as number,
    placeId: place.id?.replace(/^places\//, ""),
  };
}

async function googleAutocomplete(query: string): Promise<PlaceSearchHit[]> {
  const response = await fetch(`${GOOGLE_PLACES_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleKey(),
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text",
    },
    body: JSON.stringify({ input: query }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Google place search failed");
  const data = (await response.json()) as GoogleAutocompleteResponse;
  return (data.suggestions ?? [])
    .flatMap((item) => {
      const prediction = item.placePrediction;
      if (!prediction?.placeId) return [];
      const label =
        prediction.structuredFormat?.mainText?.text || prediction.text?.text || "Place";
      const address =
        prediction.structuredFormat?.secondaryText?.text || prediction.text?.text || label;
      return [{ label, address, placeId: prediction.placeId }];
    })
    .slice(0, 6);
}

async function googleTextSearch(query: string): Promise<PlaceHit[]> {
  const response = await fetch(`${GOOGLE_PLACES_URL}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleKey(),
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery: query, pageSize: 6 }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Google place search failed");
  const data = (await response.json()) as GoogleTextSearchResponse;
  return (data.places ?? [])
    .map(toPlaceHit)
    .filter((item): item is PlaceHit => item !== null);
}

export async function getPlaceDetails(placeId: string): Promise<PlaceHit | null> {
  const key = googleKey();
  if (!key) return null;
  const id = placeId.replace(/^places\//, "");
  const response = await fetch(`${GOOGLE_PLACES_URL}/places/${encodeURIComponent(id)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return toPlaceHit((await response.json()) as GooglePlaceDetails);
}

export async function searchPlaces(query: string): Promise<PlaceSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (googleKey()) {
    try {
      const autocomplete = await googleAutocomplete(q);
      if (autocomplete.length > 0) return autocomplete;
    } catch {
      // Fall through to text search, then Photon.
    }
    try {
      const text = await googleTextSearch(q);
      if (text.length > 0) return text;
    } catch {
      // Fall through to Photon.
    }
  }
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
