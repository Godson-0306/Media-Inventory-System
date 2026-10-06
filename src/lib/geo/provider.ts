import type { PlaceHit, PlaceSearchHit } from "@/lib/types";

export type GeocodingProvider = {
  searchPlaces: (query: string, signal?: AbortSignal) => Promise<PlaceSearchHit[]>;
  reverseGeocode: (
    latitude: number,
    longitude: number,
    signal?: AbortSignal,
  ) => Promise<PlaceHit>;
};
