"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { updateLiveLocation } from "@/actions/operations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EquipmentDTO } from "@/lib/types";

const MOVE_THRESHOLD_METERS = 50;
const MIN_INTERVAL_MS = 20_000;

function metersBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function LiveTracker({
  userId,
  equipment,
}: {
  userId: string;
  equipment: EquipmentDTO[];
}) {
  const tracked = useMemo(
    () =>
      equipment.filter(
        (item) => item.status === "SIGNED_OUT" && item.signedOutByUserId === userId,
      ),
    [equipment, userId],
  );
  const trackedIds = tracked.map((item) => item.id).sort().join(",");
  const trackedRef = useRef(tracked);
  trackedRef.current = tracked;

  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "sharing" | "denied" | "error">("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const lastSent = useRef<{ latitude: number; longitude: number; at: number } | null>(null);

  useEffect(() => {
    if (!trackedIds) {
      setStatus("idle");
      setDetail(null);
      lastSent.current = null;
      return;
    }
    if (!navigator.geolocation) {
      setStatus("error");
      setDetail("This browser cannot share GPS.");
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;
    let wakeLock: WakeLockSentinel | null = null;

    async function ensureNativeLocationPermission() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return true;
        const { Geolocation } = await import("@capacitor/geolocation");
        const status = await Geolocation.requestPermissions({ permissions: ["location"] });
        return status.location === "granted" || status.coarseLocation === "granted";
      } catch {
        return true;
      }
    }

    async function requestWakeLock() {
      try {
        wakeLock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        wakeLock = null;
      }
    }

    async function publish(position: GeolocationPosition) {
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        at: Date.now(),
      };
      const previous = lastSent.current;
      const moved = previous ? metersBetween(previous, next) : Number.POSITIVE_INFINITY;
      const elapsed = previous ? next.at - previous.at : Number.POSITIVE_INFINITY;
      if (moved < MOVE_THRESHOLD_METERS && elapsed < MIN_INTERVAL_MS) return;

      lastSent.current = next;
      const results = await Promise.all(
        trackedRef.current.map((item) =>
          updateLiveLocation({
            equipmentId: item.id,
            latitude: next.latitude,
            longitude: next.longitude,
            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
          }),
        ),
      );
      if (cancelled) return;
      const failure = results.find((result) => result.error);
      if (failure?.error) {
        setStatus("error");
        setDetail(failure.error);
        return;
      }
      setStatus("sharing");
      setDetail(null);
    }

    setStatus("sharing");
    setDetail(null);
    void (async () => {
      const allowed = await ensureNativeLocationPermission();
      if (cancelled) return;
      if (!allowed) {
        setStatus("denied");
        setDetail("Location permission is required to share a live pin.");
        return;
      }
      void requestWakeLock();
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          void publish(position);
        },
        (error) => {
          if (cancelled) return;
          if (error.code === error.PERMISSION_DENIED) {
            setStatus("denied");
            setDetail("Location permission is required to share a live pin.");
            return;
          }
          setStatus("error");
          setDetail(error.message || "Could not read phone location.");
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
      );
    })();

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      void wakeLock?.release();
    };
  }, [trackedIds, retry]);

  if (tracked.length === 0) return null;

  const count = tracked.length;
  const collapsedLabel =
    status === "denied"
      ? "Location blocked"
      : status === "error"
        ? (detail ?? "Location error")
        : status === "sharing"
          ? "Sharing location"
          : "Ready to share";

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10" role="status">
      <div className="flex items-center gap-2 px-4 py-1 md:px-6">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                status === "sharing" ? "bg-emerald-500" : "bg-amber-500",
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate">
              {`${collapsedLabel} · ${count} item${count === 1 ? "" : "s"}`}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80">
            Keep page open
          </span>
        </button>
        {status === "denied" || status === "error" ? (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              lastSent.current = null;
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </Button>
        ) : null}
      </div>
      {expanded ? (
        <div className="space-y-2 px-4 pb-3 md:px-6">
          <p className="text-sm text-foreground">{tracked.map((item) => item.name).join(", ")}</p>
          <p className="text-xs text-muted-foreground">
            Sharing stops if you lock the phone, switch apps, or close this tab. Keep this page
            open until the owner accepts the return.
          </p>
        </div>
      ) : null}
    </div>
  );
}
