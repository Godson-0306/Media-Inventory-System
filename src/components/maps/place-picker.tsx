"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlaceHit } from "@/lib/types";

const PlaceMap = dynamic(
  () => import("@/components/maps/place-map").then((mod) => mod.PlaceMap),
  { ssr: false },
);

export function PlacePicker({
  value,
  onChange,
}: {
  value: PlaceHit | null;
  onChange: (place: PlaceHit | null) => void;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const data = (await response.json()) as { places?: PlaceHit[]; error?: string };
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
      <Label htmlFor="destination">Destination on the map</Label>
      <Input
        id="destination"
        placeholder="Search a city, venue, or address"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(null);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Pick a search result or click the map to mark where this equipment is going. That pin is saved on the life record.
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Updating map...</p>
      ) : null}
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
      {hits.length > 0 && !value ? (
        <div className="max-h-40 overflow-auto rounded-lg border border-border bg-card">
          {hits.map((hit) => (
            <button
              key={`${hit.latitude}-${hit.longitude}-${hit.address}`}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChange(hit);
                setQuery(hit.label);
                setHits([]);
              }}
            >
              <span className="font-medium">{hit.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{hit.address}</span>
            </button>
          ))}
        </div>
      ) : null}
      {value ? (
        <p className="text-xs text-emerald-400">
          Marked: {value.address}
        </p>
      ) : null}
      <PlaceMap
        className="h-56 w-full rounded-xl border border-border"
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
    </div>
  );
}
