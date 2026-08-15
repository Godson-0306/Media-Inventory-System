"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { updateLiveLocation } from "@/actions/operations";
import { Button } from "@/components/ui/button";
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

  const names = tracked.map((item) => item.name).join(", ");

  return (
    <div className="border-b border-border bg-emerald-500/10 px-4 py-3 md:px-6" role="status">
      <p className="text-sm font-medium text-emerald-300">
        {status === "sharing"
          ? `Sharing live location for ${names}. Keep this page open until the owner accepts sign-in.`
          : status === "denied"
            ? "Live location is blocked until you allow GPS for this site."
            : status === "error"
              ? (detail ?? "Live location could not start.")
              : `Ready to share live location for ${names}.`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Live GPS continues while kit is signed out, including after you request sign-in. Sharing
        stops if you lock the phone, switch apps, or close this tab.
      </p>
      {status === "denied" || status === "error" ? (
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          onClick={() => {
            lastSent.current = null;
            setRetry((value) => value + 1);
          }}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
