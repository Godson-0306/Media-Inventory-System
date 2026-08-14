"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ExternalLink, Maximize2, X } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { useRefreshWhile } from "@/hooks/use-refresh-while";
import { actionLabel, cn, formatDate, formatDateTime, formatRelativeTime, statusLabel } from "@/lib/utils";
import { googleMapsUrl } from "@/lib/maps";
import type { EquipmentDTO, FaultDTO, LocationPingDTO, RentalDTO, TimelineEvent } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteEquipment, updateEquipment } from "@/actions/equipment";
import { Button } from "@/components/ui/button";
import {
  EquipmentForm,
  dateInputValue,
  type EquipmentFormValues,
} from "@/components/admin/equipment-form";

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
  canManage = false,
}: {
  equipment: EquipmentDTO;
  timeline: TimelineEvent[];
  faults: FaultDTO[];
  rentals: RentalDTO[];
  locationPings?: LocationPingDTO[];
  backHref: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EquipmentFormValues>({
    name: equipment.name,
    serialNumber: equipment.serialNumber,
    brand: equipment.brand,
    model: equipment.model,
    category: equipment.category,
    purchaseDate: dateInputValue(equipment.purchaseDate),
    warrantyDate: dateInputValue(equipment.warrantyDate),
    conditionNotes: equipment.conditionNotes,
  });
  const [mapOpen, setMapOpen] = useState(false);
  useRefreshWhile(equipment.status === "SIGNED_OUT");

  useEffect(() => {
    if (!mapOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMapOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mapOpen]);

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
  const googlePin = livePin ?? destinationPin;

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
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing((value) => !value)}>
            {editing ? "Close editor" : "Edit"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              const ok = window.confirm(
                `Delete ${equipment.name} (${equipment.serialNumber})? This cannot be undone.`,
              );
              if (!ok) return;
              startTransition(async () => {
                const result = await deleteEquipment({ id: equipment.id });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Asset deleted");
                router.push("/admin/equipment");
                router.refresh();
              });
            }}
          >
            Delete
          </Button>
        </div>
      ) : null}
      {canManage && editing ? (
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Edit equipment</h2>
          <EquipmentForm
            form={form}
            onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
            pending={pending}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={() =>
              startTransition(async () => {
                const result = await updateEquipment({ id: equipment.id, ...form });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Asset updated");
                setEditing(false);
                router.refresh();
              })
            }
          />
        </Card>
      ) : null}

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Current location</h2>
            {currentPins.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setMapOpen(true)}>
                  <Maximize2 className="h-4 w-4" />
                  Expand map
                </Button>
                {googlePin ? (
                  <a
                    className={mapLinkClass}
                    href={googleMapsUrl(googlePin.latitude, googlePin.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in Google Maps
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
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
      {mapOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <p className="font-medium">{equipment.name}</p>
              <p className="text-xs text-muted-foreground">
                {livePin ? "Live pin vs job destination" : equipment.locationLabel ?? "Map"}
                {liveLabel ? ` · updated ${liveLabel}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {googlePin ? (
                <a
                  className={mapLinkClass}
                  href={googleMapsUrl(googlePin.latitude, googlePin.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Maps
                </a>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={() => setMapOpen(false)}>
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
          <PlaceMap className="h-[calc(100dvh-3.75rem)] w-full" pins={currentPins} path={trail} />
        </div>
      ) : null}
    </div>
  );
}

const mapLinkClass = cn(
  "inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted",
);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </Card>
  );
}
