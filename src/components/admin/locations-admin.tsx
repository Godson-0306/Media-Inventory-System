"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createLocation, deleteLocation, updateLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { capReached, formatCap } from "@/lib/plans";
import type { LocationDTO } from "@/lib/types";

const emptyForm = { name: "", address: "" };

export function LocationsAdmin({
  locations,
  maxLocations,
}: {
  locations: LocationDTO[];
  maxLocations: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const atCap = !editingId && capReached(locations.length, maxLocations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Office and storage addresses for this company. Staff return kit here on sign-in. Job
          destinations are entered on the map when they request a sign-out.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Office / storage sites</h2>
            <span className="text-sm text-muted-foreground">
              {formatCap(locations.length, maxLocations, "locations")}
            </span>
          </div>
          {locations.length === 0 ? (
            <EmptyState
              title="No office sites yet"
              description="Add the storage cage or office address on the right."
            />
          ) : (
            <div className="space-y-2">
              {locations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.address || "No address"}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({ name: item.name, address: item.address ?? "" });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => {
                        const ok = window.confirm(`Delete ${item.name}?`);
                        if (!ok) return;
                        startTransition(async () => {
                          const result = await deleteLocation({ id: item.id });
                          if (result.error) toast.error(result.error);
                          else {
                            toast.success("Location deleted");
                            if (editingId === item.id) {
                              setEditingId(null);
                              setForm(emptyForm);
                            }
                          }
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 font-medium">
            {editingId ? "Edit office site" : "Add office / storage site"}
          </h2>
          {atCap ? (
            <p className="mb-3 text-sm text-amber-600 dark:text-amber-200">
              This plan is at its location cap. Upgrade to add more sites.
            </p>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = editingId
                  ? await updateLocation({ id: editingId, ...form })
                  : await createLocation(form);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(editingId ? "Location updated" : "Location added");
                setEditingId(null);
                setForm(emptyForm);
              });
            }}
          >
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                disabled={atCap}
              />
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Input
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                disabled={atCap}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={pending || atCap}>
                {pending ? "Saving..." : editingId ? "Save changes" : "Add office site"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
