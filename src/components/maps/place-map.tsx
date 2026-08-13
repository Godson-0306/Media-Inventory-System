"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  latitude: number;
  longitude: number;
  label: string;
  kind?: "destination" | "live" | "trail";
};

const PIN_STYLE = {
  destination: { radius: 9, color: "#60a5fa", fillColor: "#3b82f6" },
  live: { radius: 10, color: "#6ee7b7", fillColor: "#10b981" },
  trail: { radius: 4, color: "#94a3b8", fillColor: "#64748b" },
} as const;

export function PlaceMap({
  pins,
  path,
  className,
  onPick,
}: {
  pins: MapPin[];
  path?: Array<{ latitude: number; longitude: number }>;
  className?: string;
  onPick?: (latitude: number, longitude: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pinKey = JSON.stringify({ pins, path });

  useEffect(() => {
    if (!ref.current) return;
    const payload = JSON.parse(pinKey) as {
      pins: MapPin[];
      path?: Array<{ latitude: number; longitude: number }>;
    };
    const currentPins = payload.pins;
    const trail = payload.path ?? [];
    const map = L.map(ref.current, { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    if (trail.length > 1) {
      L.polyline(
        trail.map((point) => [point.latitude, point.longitude] as [number, number]),
        { color: "#34d399", weight: 3, opacity: 0.85 },
      ).addTo(map);
    }

    const markers = currentPins.map((pin) => {
      const style = PIN_STYLE[pin.kind ?? "destination"];
      return L.circleMarker([pin.latitude, pin.longitude], {
        radius: style.radius,
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(map)
        .bindPopup(pin.label);
    });

    const boundsPoints: Array<[number, number]> = [
      ...currentPins.map((pin) => [pin.latitude, pin.longitude] as [number, number]),
      ...trail.map((point) => [point.latitude, point.longitude] as [number, number]),
    ];

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 13);
    } else if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28] });
    } else {
      map.setView([9.082, 8.6753], 6);
    }
    const live = markers.find((_, index) => currentPins[index]?.kind === "live");
    (live ?? markers[0])?.openPopup();

    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current?.(event.latlng.lat, event.latlng.lng);
    });

    const resize = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(resize);
      map.remove();
    };
  }, [pinKey]);

  return (
    <div
      ref={ref}
      className={className ?? "h-64 w-full rounded-xl border border-border"}
      style={onPick ? { cursor: "crosshair" } : undefined}
    />
  );
}
