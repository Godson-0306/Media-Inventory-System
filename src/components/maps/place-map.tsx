"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ESRI_ATTRIBUTION,
  ESRI_IMAGERY_TILE_URL,
  NIGERIA_CENTER,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/geo/config";

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

function destinationIcon() {
  return L.divIcon({
    className: "aop-map-pin",
    html: '<span class="aop-map-pin-mark" aria-hidden="true"></span>',
    iconSize: [28, 40],
    iconAnchor: [14, 38],
    popupAnchor: [0, -32],
  });
}

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function PlaceMap({
  pins,
  path,
  className,
  onPick,
  picker = false,
  compact = false,
}: {
  pins: MapPin[];
  path?: Array<{ latitude: number; longitude: number }>;
  className?: string;
  onPick?: (latitude: number, longitude: number) => void;
  picker?: boolean;
  compact?: boolean;
}) {
  const dark = useIsDark();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  const [satellite, setSatellite] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [armed, setArmed] = useState(!compact);
  const armedRef = useRef(!compact);
  const pinKey = JSON.stringify({ pins, path });
  const lastFitKey = useRef("");

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, {
      scrollWheelZoom: !compact,
      dragging: armedRef.current,
      attributionControl: true,
      zoomControl: true,
    });
    map.setView([NIGERIA_CENTER.latitude, NIGERIA_CENTER.longitude], 6);
    mapObj.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current?.(event.latlng.lat, event.latlng.lng);
    });
    const resize = window.setTimeout(() => map.invalidateSize(), 80);
    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapObj.current = null;
      tilesRef.current = null;
      layerRef.current = null;
    };
    // Map instance is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (tilesRef.current) {
      map.removeLayer(tilesRef.current);
    }
    const url = satellite ? ESRI_IMAGERY_TILE_URL : OSM_TILE_URL;
    const attribution = satellite
      ? `${OSM_ATTRIBUTION} | ${ESRI_ATTRIBUTION}`
      : OSM_ATTRIBUTION;
    tilesRef.current = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      className: !satellite && dark ? "aop-osm-dark" : undefined,
    }).addTo(map);
  }, [dark, satellite]);

  useEffect(() => {
    const map = mapObj.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const payload = JSON.parse(pinKey) as {
      pins: MapPin[];
      path?: Array<{ latitude: number; longitude: number }>;
    };
    const currentPins = payload.pins;
    const trail = payload.path ?? [];

    if (trail.length > 1) {
      L.polyline(
        trail.map((point) => [point.latitude, point.longitude] as [number, number]),
        { color: "#34d399", weight: 3, opacity: 0.85 },
      ).addTo(group);
    }

    const markers = currentPins.map((pin) => {
      if (picker && (pin.kind ?? "destination") === "destination") {
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: destinationIcon(),
          draggable: Boolean(onPickRef.current),
          autoPan: true,
          title: pin.label,
        }).bindPopup(pin.label);
        marker.on("dragend", () => {
          const latlng = marker.getLatLng();
          onPickRef.current?.(latlng.lat, latlng.lng);
        });
        marker.addTo(group);
        return marker;
      }
      const style = PIN_STYLE[pin.kind ?? "destination"];
      return L.circleMarker([pin.latitude, pin.longitude], {
        radius: style.radius,
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup(pin.label)
        .addTo(group);
    });

    const boundsPoints: Array<[number, number]> = [
      ...currentPins.map((pin) => [pin.latitude, pin.longitude] as [number, number]),
      ...trail.map((point) => [point.latitude, point.longitude] as [number, number]),
    ];
    const fitKey = boundsPoints.map((point) => point.join(",")).join("|");
    const movedFar = lastFitKey.current !== fitKey;
    lastFitKey.current = fitKey;
    if (movedFar) {
      if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], Math.max(map.getZoom() || 6, 15));
      } else if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28] });
      }
    }
    const live = markers.find((_, index) => currentPins[index]?.kind === "live");
    (live ?? markers[0])?.openPopup();
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [pinKey, picker]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (armed) map.dragging.enable();
    else map.dragging.disable();
  }, [armed]);

  useEffect(() => {
    function onFs() {
      setFullscreen(Boolean(document.fullscreenElement));
      window.setTimeout(() => mapObj.current?.invalidateSize(), 120);
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const destination = pins.find((pin) => (pin.kind ?? "destination") === "destination") ?? pins[0];

  function recenter() {
    if (!destination || !mapObj.current) return;
    mapObj.current.setView([destination.latitude, destination.longitude], 16);
  }

  async function toggleFullscreen() {
    const node = wrapRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await node.requestFullscreen();
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-background",
        className,
        fullscreen ? "h-full min-h-full rounded-none" : null,
      )}
    >
      <div ref={mapRef} className="h-full min-h-[260px] w-full" />
      {picker && compact && !armed ? (
        <button
          type="button"
          className="absolute inset-0 z-[400] flex items-center justify-center bg-background/55 text-sm font-medium text-foreground backdrop-blur-[1px]"
          onClick={() => setArmed(true)}
        >
          Tap to move the map
        </button>
      ) : null}
      {picker ? (
        <div className="pointer-events-none absolute right-2 top-2 z-[500] flex flex-col gap-1">
          <div className="pointer-events-auto flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <button
              type="button"
              className={cn(
                "h-9 px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !satellite ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
              onClick={() => setSatellite(false)}
            >
              Map
            </button>
            <button
              type="button"
              className={cn(
                "h-9 px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                satellite ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
              onClick={() => setSatellite(true)}
            >
              Satellite
            </button>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto h-9 w-9 bg-card"
            onClick={recenter}
            disabled={!destination}
            aria-label="Recenter on pin"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto h-9 w-9 bg-card"
            onClick={() => {
              void toggleFullscreen();
            }}
            aria-label={fullscreen ? "Exit fullscreen map" : "Fullscreen map"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
