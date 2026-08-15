"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { googleMapsUrl, publicGoogleMapsKey } from "@/lib/maps";
import type { PlaceHit, PlaceSearchHit } from "@/lib/types";

const PlaceMap = dynamic(
  () => import("@/components/maps/place-map").then((mod) => mod.PlaceMap),
  { ssr: false },
);

const GooglePlacePreview = dynamic(
  () => import("@/components/maps/google-place-preview").then((mod) => mod.GooglePlacePreview),
  { ssr: false },
);

export function PlacePicker({
  value,
  onChange,
  compact = false,
}: {
  value: PlaceHit | null;
  onChange: (place: PlaceHit | null) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [hits, setHits] = useState<PlaceSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useGooglePreview = Boolean(publicGoogleMapsKey());
  const previewClass = `${compact ? (useGooglePreview ? "h-52" : "h-40") : "h-56"} w-full rounded-xl border border-border`;

  useEffect(() => {
    const q = query.trim();
    const handle = setTimeout(async () => {
      if (q.length < 2) {
        setHits([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
        const data = (await response.json()) as { places?: PlaceSearchHit[]; error?: string };
        if (!response.ok) {
          setHits([]);
          setError(data.error ?? "Search failed. Click the map to mark the place.");
          return;
        }
        setHits(data.places ?? []);
        if ((data.places ?? []).length === 0) {
          setError("No matches. Click the map to drop a pin on the exact place.");
        }
      } catch {
        setHits([]);
        setError("Search is unavailable. Click the map to drop a pin.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  async function pickHit(hit: PlaceSearchHit) {
    if (
      Number.isFinite(hit.latitude) &&
      Number.isFinite(hit.longitude) &&
      hit.latitude != null &&
      hit.longitude != null
    ) {
      onChange({
        label: hit.label,
        address: hit.address,
        latitude: hit.latitude,
        longitude: hit.longitude,
        placeId: hit.placeId,
      });
      setQuery(hit.label);
      setHits([]);
      return;
    }
    if (!hit.placeId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/geo/search?placeId=${encodeURIComponent(hit.placeId)}`);
      const data = (await response.json()) as { places?: PlaceHit[]; error?: string };
      const place = data.places?.[0];
      if (!place) {
        setError(data.error ?? "Could not load that Google place. Drop a pin on the map instead.");
        return;
      }
      onChange(place);
      setQuery(place.label);
      setHits([]);
    } catch {
      setError("Could not load that Google place. Drop a pin on the map instead.");
    } finally {
      setLoading(false);
    }
  }

  async function dropPin(latitude: number, longitude: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/geo/search?lat=${latitude}&lng=${longitude}`,
      );
      const data = (await response.json()) as { places?: PlaceHit[] };
      const place = data.places?.[0] ?? {
        label: "Dropped pin",
        address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        latitude,
        longitude,
      };
      onChange(place);
      setQuery(place.label);
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="destination">Job destination on the map</Label>
      <Input
        id="destination"
        placeholder="Search a venue, church, client, or address"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(null);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Search the job, pick a result, then confirm the Street View or map pin before you request sign
        out.
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Updating map...</p>
      ) : null}
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
      {hits.length > 0 && !value ? (
        <div className="max-h-40 overflow-auto rounded-lg border border-border bg-card">
          {hits.map((hit) => (
            <button
              key={hit.placeId ?? `${hit.latitude}-${hit.longitude}-${hit.address}`}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                void pickHit(hit);
              }}
            >
              <span className="font-medium">{hit.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{hit.address}</span>
            </button>
          ))}
        </div>
      ) : null}
      {value ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-emerald-400">Marked: {value.address}</p>
          <a
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            href={googleMapsUrl(value.latitude, value.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            View in Google Maps
          </a>
        </div>
      ) : null}
      {useGooglePreview ? (
        <GooglePlacePreview className={previewClass} value={value} onPick={dropPin} />
      ) : (
        <PlaceMap
          className={previewClass}
          pins={
            value
              ? [
                  {
                    latitude: value.latitude,
                    longitude: value.longitude,
                    label: value.label,
                  },
                ]
              : []
          }
          onPick={dropPin}
        />
      )}
    </div>
  );
}
