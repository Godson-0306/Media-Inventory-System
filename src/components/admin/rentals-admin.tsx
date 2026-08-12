"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createRental, returnRental } from "@/actions/rentals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";
import type { EquipmentDTO, RentalDTO } from "@/lib/types";

export function RentalsAdmin({
  rentals,
  equipment,
}: {
  rentals: RentalDTO[];
  equipment: EquipmentDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    type: "OUT",
    equipmentId: "",
    counterparty: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Rentals</h1>
        <p className="text-sm text-muted-foreground">
          Track external rentals and organization-owned items leaving for events or clients.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Rental records</h2>
          {rentals.length === 0 ? (
            <EmptyState
              title="No rentals yet"
              description="Create a rental in or out to keep event and vendor movement visible."
            />
          ) : (
            <div className="space-y-2">
              {rentals.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {item.type === "IN" ? "Rental in" : "Rental out"} · {item.counterparty}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.equipmentName ?? "Unlinked item"} · {formatDate(item.startDate)}
                      </p>
                    </div>
                    {item.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await returnRental(item.id);
                            if (result.error) toast.error(result.error);
                            else toast.success("Rental closed");
                          })
                        }
                      >
                        Mark returned
                      </Button>
                    ) : (
                      <span className="text-xs uppercase text-muted-foreground">{item.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Create rental</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await createRental(form);
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Rental created");
                  setForm((current) => ({ ...current, counterparty: "", notes: "" }));
                }
              });
            }}
          >
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="OUT">Rental out</option>
                <option value="IN">Rental in</option>
              </Select>
            </div>
            <div>
              <Label>Equipment</Label>
              <Select
                value={form.equipmentId}
                onChange={(event) => setForm({ ...form, equipmentId: event.target.value })}
              >
                <option value="">Unlinked / external</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.serialNumber})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Counterparty</Label>
              <Input
                value={form.counterparty}
                onChange={(event) => setForm({ ...form, counterparty: event.target.value })}
                required
              />
            </div>
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                required
              />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <Button className="w-full" disabled={pending}>
              {pending ? "Saving..." : "Create rental"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
