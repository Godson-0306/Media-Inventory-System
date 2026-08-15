"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";
import type { PlaceHit } from "@/lib/types";

const NIGERIA_CENTER = { lat: 9.082, lng: 8.6753 };

export function GooglePlacePreview({
  value,
  className,
  onPick,
}: {
  value: PlaceHit | null;
  className?: string;
  onPick?: (latitude: number, longitude: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [mode, setMode] = useState<"loading" | "street" | "map" | "error">("loading");

  const pinKey = value
    ? `${value.latitude},${value.longitude},${value.label}`
    : "empty";

  useEffect(() => {
    let cancelled = false;
    const container = ref.current;
    if (!container) return;

    setMode("loading");
    container.replaceChildren();

    void loadGoogleMaps()
      .then((g) => {
        if (cancelled || !ref.current) return;
        const maps = g.maps;
        const target = value
          ? { lat: value.latitude, lng: value.longitude }
          : NIGERIA_CENTER;

        function showMap() {
          if (cancelled || !ref.current) return;
          setMode("map");
          const map = new maps.Map(ref.current, {
            center: target,
            zoom: value ? 17 : 6,
            mapTypeControl: true,
            streetViewControl: Boolean(value),
            fullscreenControl: true,
          });
          if (value) {
            new maps.Marker({
              map,
              position: target,
              title: value.label,
            });
          }
          map.addListener("click", (event: google.maps.MapMouseEvent) => {
            const latLng = event.latLng;
            if (!latLng) return;
            onPickRef.current?.(latLng.lat(), latLng.lng());
          });
        }

        if (!value) {
          showMap();
          return;
        }

        const street = new maps.StreetViewService();
        street.getPanorama({ location: target, radius: 120 }, (data, status) => {
            if (cancelled || !ref.current) return;
            if (status !== maps.StreetViewStatus.OK || !data?.location?.latLng) {
              showMap();
              return;
            }
            setMode("street");
            const location = data.location.latLng;
            new maps.StreetViewPanorama(ref.current, {
              position: location,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: true,
              fullscreenControl: true,
              linksControl: true,
              panControl: true,
            });
          },
        );
      })
      .catch(() => {
        if (!cancelled) setMode("error");
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [pinKey, value]);

  return (
    <div className="space-y-1">
      <div ref={ref} className={className} />
      {mode === "loading" ? (
        <p className="text-xs text-muted-foreground">Loading Google preview...</p>
      ) : null}
      {mode === "street" ? (
        <p className="text-xs text-emerald-400">Street View at this pin. Confirm before you request sign out.</p>
      ) : null}
      {mode === "map" && value ? (
        <p className="text-xs text-amber-400">
          Street View is not available here. The Google Map pin is the job location.
        </p>
      ) : null}
      {mode === "error" ? (
        <p className="text-xs text-amber-400">
          Google preview could not load. Use View in Google Maps, or drop a pin after search.
        </p>
      ) : null}
    </div>
  );
}
