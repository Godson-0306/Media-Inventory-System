"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { useRefreshWhile } from "@/hooks/use-refresh-while";
import { actionLabel, formatDate, formatDateTime, formatRelativeTime, statusLabel } from "@/lib/utils";
import type { EquipmentDTO, FaultDTO, LocationPingDTO, RentalDTO, TimelineEvent } from "@/lib/types";

const PlaceMap = dynamic(
  () => import("@/components/maps/place-map").then((mod) => mod.PlaceMap),
  { ssr: false },
);

export function LifeRecord({
  equipment,
  timeline,
  faults,
  rentals,
  locationPings = [],
  backHref,
}: {
  equipment: EquipmentDTO;
  timeline: TimelineEvent[];
  faults: FaultDTO[];
  rentals: RentalDTO[];
  locationPings?: LocationPingDTO[];
  backHref: string;
}) {
  useRefreshWhile(equipment.status === "SIGNED_OUT");

  const destinationPin =
    equipment.latitude !== null && equipment.longitude !== null
      ? {
          latitude: equipment.latitude,
          longitude: equipment.longitude,
          label: `Destination: ${equipment.locationLabel ?? equipment.name}`,
          kind: "destination" as const,
        }
      : null;

  const livePin =
    equipment.liveLatitude !== null && equipment.liveLongitude !== null
      ? {
          latitude: equipment.liveLatitude,
          longitude: equipment.liveLongitude,
          label: `Live${equipment.liveUpdatedAt ? ` · ${formatRelativeTime(equipment.liveUpdatedAt)}` : ""}`,
          kind: "live" as const,
        }
      : null;

  const currentPins = [destinationPin, livePin].filter(
    (pin): pin is NonNullable<typeof pin> => pin !== null,
  );

  const historyPins = timeline
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .map((item) => ({
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      label: item.place ?? actionLabel(item.action),
      kind: "destination" as const,
    }));

  const trail = locationPings.map((ping) => ({
    latitude: ping.latitude,
    longitude: ping.longitude,
  }));

  const liveLabel = formatRelativeTime(equipment.liveUpdatedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={backHref} className="text-sm text-primary hover:underline">
            Back
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{equipment.name}</h1>
          <p className="text-sm text-muted-foreground">
            {equipment.brand} {equipment.model} · {equipment.serialNumber}
          </p>
        </div>
        <Badge className="border-primary/30 bg-primary/10 text-primary">
          {statusLabel(equipment.status)}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Operator" value={equipment.currentOperator ?? "—"} />
        <Stat label="Current place" value={equipment.locationLabel ?? "Storage / cage"} />
        <Stat label="Live location" value={liveLabel ? `Updated ${liveLabel}` : "Not sharing"} />
        <Stat label="Use count" value={String(equipment.useCount)} />
        <Stat
          label="Warranty"
          value={equipment.warrantyDate ? formatDate(equipment.warrantyDate) : "—"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <h2 className="mb-3 font-medium">Current location</h2>
          <PlaceMap pins={currentPins} path={trail} />
          {livePin ? (
            <p className="mt-2 text-sm text-emerald-400">
              Live pin is the operator’s phone. Blue pin is the planned destination
              {equipment.locationAddress ? ` (${equipment.locationAddress})` : ""}.
            </p>
          ) : equipment.locationAddress ? (
            <p className="mt-2 text-sm text-muted-foreground">{equipment.locationAddress}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No map pin yet. After a sign-out, the destination marker is stored here. Live GPS
              appears while the operator keeps the workspace open on their phone.
            </p>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-medium">Previous destinations</h2>
          {historyPins.length === 0 ? (
            <EmptyState
              title="No mapped destinations yet"
              description="Sign this asset out to a place and the pin history will appear here."
            />
          ) : (
            <PlaceMap pins={historyPins} />
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-4 font-medium">Life timeline</h2>
        {timeline.length === 0 ? (
          <EmptyState
            title="No life events yet"
            description="Sign-outs, sign-ins, faults, and rentals for this serial will collect here."
          />
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-3">
                <p className="text-sm font-medium">{actionLabel(item.action)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.summary} · {item.userName ?? "System"} · {formatDateTime(item.createdAt)}
                </p>
                {item.place ? (
                  <p className="mt-1 text-xs text-primary">
                    {item.place}
                    {item.address && item.address !== item.place ? ` · ${item.address}` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {faults.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-3 font-medium">Fault history</h2>
          <div className="space-y-2">
            {faults.map((item) => (
              <p key={item.id} className="text-sm text-muted-foreground">
                {item.status.replace("_", " ")} · {item.description} · {item.reporterName}
              </p>
            ))}
          </div>
        </Card>
      ) : null}

      {rentals.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-3 font-medium">Rental history</h2>
          <div className="space-y-2">
            {rentals.map((item) => (
              <p key={item.id} className="text-sm text-muted-foreground">
                {item.type} · {item.counterparty} · {item.status}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </Card>
  );
}
