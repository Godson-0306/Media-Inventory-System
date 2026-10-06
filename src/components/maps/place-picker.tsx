"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Copy, ExternalLink, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { googleMapsUrl } from "@/lib/maps";
import { GEO_DEBOUNCE_MS, GEO_MIN_QUERY_LENGTH } from "@/lib/geo/config";
import { parsePastedLocation } from "@/lib/geo/parse-location";
import { readRecentJobSites, rememberJobSite } from "@/lib/recent-job-sites";
import { cn } from "@/lib/utils";
import type { PlaceHit, PlaceSearchHit } from "@/lib/types";

const PlaceMap = dynamic(
  () => import("@/components/maps/place-map").then((mod) => mod.PlaceMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

const searchCache = new Map<string, PlaceSearchHit[]>();
const reverseCache = new Map<string, PlaceHit>();

function formatCoords(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function PlacePicker({
  value,
  onChange,
  compact = false,
}: {
  value: PlaceHit | null;
  onChange: (place: PlaceHit | null) => void;
  compact?: boolean;
}) {
  const listId = useId();
  const statusId = useId();
  const [query, setQuery] = useState(value?.label ?? "");
  const [hits, setHits] = useState<PlaceSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [recent, setRecent] = useState(readRecentJobSites);
  const abortRef = useRef<AbortController | null>(null);
  const skipSearch = useRef(true);
  const noteValue = value?.note ?? note;
  const trimmedQuery = query.trim();
  const pasted = parsePastedLocation(trimmedQuery);
  const matchesSelected = Boolean(
    value && trimmedQuery.toLowerCase() === value.label.trim().toLowerCase(),
  );
  const canSearch =
    trimmedQuery.length >= GEO_MIN_QUERY_LENGTH &&
    pasted.kind === "text" &&
    !matchesSelected;

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (!canSearch) {
      abortRef.current?.abort();
      return;
    }
    const q = trimmedQuery;
    const handle = window.setTimeout(() => {
      const cached = searchCache.get(q.toLowerCase());
      if (cached) {
        setHits(cached);
        setOpen(true);
        setActiveIndex(cached.length > 0 ? 0 : -1);
        setStatus(
          cached.length === 0
            ? "No results. Try a nearby landmark, or drop a pin on the map."
            : `${cached.length} result${cached.length === 1 ? "" : "s"}`,
        );
        setLoading(false);
        setError(null);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setStatus("Searching…");
      void fetch(`/api/geo/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(async (response) => {
          const data = (await response.json()) as { places?: PlaceSearchHit[]; error?: string };
          if (controller.signal.aborted) return;
          if (!response.ok) {
            setHits([]);
            setOpen(false);
            setError(data.error ?? "Search failed. Drop a pin on the map instead.");
            setStatus(null);
            return;
          }
          const places = data.places ?? [];
          searchCache.set(q.toLowerCase(), places);
          setHits(places);
          setOpen(true);
          setActiveIndex(places.length > 0 ? 0 : -1);
          setStatus(
            places.length === 0
              ? "No results. Try a nearby landmark, or drop a pin on the map."
              : `${places.length} result${places.length === 1 ? "" : "s"}`,
          );
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          setHits([]);
          setOpen(false);
          setError(
            typeof navigator !== "undefined" && navigator.onLine === false
              ? "You're offline. Drop a pin on the map to continue."
              : caught instanceof Error && caught.name === "AbortError"
                ? null
                : "Search is unavailable. Drop a pin on the map instead.",
          );
          setStatus(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }, GEO_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [canSearch, trimmedQuery]);

  const visibleHits = canSearch ? hits : [];
  const dropdownOpen = canSearch && open;

  function applyPlace(place: PlaceHit, label = place.label) {
    const next = { ...place, note: noteValue.trim() || place.note };
    onChange(next);
    skipSearch.current = true;
    setQuery(label);
    setHits([]);
    setOpen(false);
    setStatus(null);
    setError(null);
    rememberJobSite({
      label: next.label,
      address: next.address,
      latitude: next.latitude,
      longitude: next.longitude,
      note: next.note,
    });
    setRecent(readRecentJobSites());
  }

  async function reverseDrop(
    latitude: number,
    longitude: number,
    source: PlaceHit["source"] = "pin",
  ) {
    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cached = reverseCache.get(key);
    if (cached) {
      applyPlace({ ...cached, source });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/geo/search?lat=${latitude}&lng=${longitude}`);
      const data = (await response.json()) as { places?: PlaceHit[] };
      const place = data.places?.[0] ?? {
        label: formatCoords(latitude, longitude),
        address: formatCoords(latitude, longitude),
        latitude,
        longitude,
      };
      reverseCache.set(key, {
        label: place.label,
        address: place.address,
        latitude,
        longitude,
      });
      applyPlace({
        label: place.label,
        address: place.address,
        latitude,
        longitude,
        source,
      });
    } catch {
      applyPlace({
        label: formatCoords(latitude, longitude),
        address: formatCoords(latitude, longitude),
        latitude,
        longitude,
        source,
      });
    } finally {
      setLoading(false);
    }
  }

  async function resolvePasted(raw: string) {
    const parsed = parsePastedLocation(raw);
    if (parsed.kind === "coords" || parsed.kind === "pluscode" || parsed.kind === "maps-url") {
      await reverseDrop(parsed.latitude, parsed.longitude, "paste");
      return true;
    }
    if (parsed.kind === "short-link") {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/geo/search?url=${encodeURIComponent(parsed.url)}`);
        const data = (await response.json()) as { places?: PlaceHit[]; error?: string };
        const place = data.places?.[0];
        if (!place) {
          setError(
            data.error ??
              "That short Maps link could not be resolved. Paste the full Google Maps URL or lat,lng instead.",
          );
          return true;
        }
        applyPlace({ ...place, source: "paste" });
      } catch {
        setError("That short Maps link could not be resolved. Paste the full URL or lat,lng instead.");
      } finally {
        setLoading(false);
      }
      return true;
    }
    if (parsed.kind === "unresolved-link" || parsed.kind === "invalid") {
      setError(parsed.message);
      return true;
    }
    return false;
  }

  function pickHit(hit: PlaceSearchHit) {
    if (hit.latitude == null || hit.longitude == null) return;
    applyPlace(
      {
        label: hit.label,
        address: hit.address,
        latitude: hit.latitude,
        longitude: hit.longitude,
        placeId: hit.placeId,
        source: "search",
      },
      hit.label,
    );
  }

  async function locateUser() {
    setLoading(true);
    setError(null);
    try {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import("@capacitor/geolocation");
          const permission = await Geolocation.requestPermissions({ permissions: ["location"] });
          if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
            setError("Location permission is required to use your current position.");
            setLoading(false);
            return;
          }
        }
      } catch {
        // Browser geolocation is enough on the web.
      }
      if (!navigator.geolocation) {
        setError("This browser cannot read your current location.");
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void reverseDrop(position.coords.latitude, position.coords.longitude, "geolocation");
        },
        (geoError) => {
          setLoading(false);
          setError(
            geoError.code === geoError.PERMISSION_DENIED
              ? "Location permission was denied. You can still search or drop a pin."
              : "Could not read your current location. Search or drop a pin instead.",
          );
        },
        { enableHighAccuracy: true, timeout: 12_000 },
      );
    } catch {
      setLoading(false);
      setError("Could not read your current location. Search or drop a pin instead.");
    }
  }

  async function copyCoords() {
    if (!value) return;
    const text = formatCoords(value.latitude, value.longitude);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Coordinates copied");
    } catch {
      toast.error("Could not copy coordinates");
    }
  }

  function onNoteChange(next: string) {
    setNote(next);
    if (value) onChange({ ...value, note: next });
  }

  const mapHeight = compact ? "h-[260px]" : "h-96";

  return (
    <div className="space-y-3">
      <div className="relative">
        <Label htmlFor="destination">Search for the job location</Label>
        <Input
          id="destination"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          aria-busy={loading}
          aria-describedby={statusId}
          placeholder="Venue, address, Plus Code, or Maps link"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            void resolvePasted(text);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!dropdownOpen || visibleHits.length === 0) {
              if (event.key === "Enter") {
                event.preventDefault();
                void resolvePasted(query);
              }
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => (current + 1) % visibleHits.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => (current <= 0 ? visibleHits.length - 1 : current - 1));
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              pickHit(visibleHits[activeIndex]!);
            }
          }}
        />
        <p id={statusId} className="sr-only" aria-live="polite">
          {loading ? "Searching" : error ?? status ?? ""}
        </p>
        {dropdownOpen && (visibleHits.length > 0 || status || error) ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Location suggestions"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
          >
            {visibleHits.map((hit, index) => (
              <li key={`${hit.latitude}-${hit.longitude}-${hit.address}`} role="presentation">
                <button
                  type="button"
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    "block min-h-11 w-full px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    index === activeIndex ? "bg-muted" : "hover:bg-muted/70",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pickHit(hit)}
                >
                  <span className="font-medium">{hit.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hit.address}</span>
                </button>
              </li>
            ))}
            {visibleHits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{error ?? status}</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void locateUser()}>
          <LocateFixed className="h-4 w-4" />
          Use my current location
        </Button>
      </div>

      {recent.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {recent.map((site) => (
            <button
              key={`${site.latitude}-${site.longitude}`}
              type="button"
              className="min-h-9 rounded-full border border-border bg-muted/40 px-3 text-xs font-medium hover:bg-muted"
              onClick={() =>
                applyPlace(
                  {
                    label: site.label,
                    address: site.address,
                    latitude: site.latitude,
                    longitude: site.longitude,
                    note: site.note,
                    source: "recent",
                  },
                  site.label,
                )
              }
            >
              {site.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="text-xs text-muted-foreground">Updating map…</p> : null}
      {error ? (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {error}
        </p>
      ) : null}

      <PlaceMap
        className={`${mapHeight} w-full`}
        picker
        compact={compact}
        pins={
          value
            ? [{ latitude: value.latitude, longitude: value.longitude, label: value.label }]
            : []
        }
        onPick={(latitude, longitude) => {
          void reverseDrop(latitude, longitude, "pin");
        }}
      />
      <p className="text-xs text-muted-foreground">
        Search, paste coordinates or a Maps link, or drop a pin. Drag the pin to fine-tune. Map data
        © OpenStreetMap, search © Komoot Photon / Nominatim. Satellite tiles © Esri.
      </p>

      <div>
        <Label htmlFor="location-note">Location note (optional)</Label>
        <Input
          id="location-note"
          placeholder="Behind the church, blue gate"
          value={noteValue}
          onChange={(event) => onNoteChange(event.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Add a landmark the crew will recognise. Street View is not available on this map.
        </p>
      </div>

      {value ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Marked: {formatCoords(value.latitude, value.longitude)}
          </p>
          <a
            className="inline-flex min-h-9 items-center gap-1 text-xs text-primary hover:underline"
            href={googleMapsUrl(value.latitude, value.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            View in Google Maps
          </a>
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => void copyCoords()}
          >
            <Copy className="h-3 w-3" />
            Copy coordinates
          </button>
        </div>
      ) : null}
    </div>
  );
}
