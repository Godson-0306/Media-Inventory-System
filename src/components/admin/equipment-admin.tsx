"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { createEquipment } from "@/actions/equipment";
import { seedSampleKit } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { CATEGORIES } from "@/lib/constants";
import type { EquipmentDTO } from "@/lib/types";

export function EquipmentAdmin({ equipment }: { equipment: EquipmentDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    serialNumber: "",
    brand: "",
    model: "",
    category: "CAMERAS",
    purchaseDate: "",
    warrantyDate: "",
    conditionNotes: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Equipment</h1>
        <p className="text-sm text-muted-foreground">
          Protected operational management for high-trust workflows.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-medium">Equipment inventory</h2>
              <p className="text-sm text-muted-foreground">
                Protected management for serialized assets.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{equipment.length} Items</span>
          </div>
          {equipment.length === 0 ? (
            <EmptyState
              title="No items found"
              description="Create an asset on the right, or load a sample production kit to explore the workflow."
              action={
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await seedSampleKit();
                      if (result.error) toast.error(result.error);
                      else toast.success("Sample production kit loaded");
                    })
                  }
                >
                  Load sample kit
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {equipment.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.serialNumber} · {item.brand} {item.model}
                      </p>
                    </div>
                    <span className="text-xs uppercase text-primary">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Add equipment</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await createEquipment(form);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Asset created");
                setForm({
                  name: "",
                  serialNumber: "",
                  brand: "",
                  model: "",
                  category: "CAMERAS",
                  purchaseDate: "",
                  warrantyDate: "",
                  conditionNotes: "",
                });
              });
            }}
          >
            <Field label="Equipment name">
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </Field>
            <Field label="Serial number">
              <Input
                value={form.serialNumber}
                onChange={(e) => update("serialNumber", e.target.value)}
                required
              />
            </Field>
            <Field label="Brand">
              <Input value={form.brand} onChange={(e) => update("brand", e.target.value)} required />
            </Field>
            <Field label="Model">
              <Input value={form.model} onChange={(e) => update("model", e.target.value)} required />
            </Field>
            <Field label="Select category">
              <Select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Purchase date">
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => update("purchaseDate", e.target.value)}
              />
            </Field>
            <Field label="Warranty date">
              <Input
                type="date"
                value={form.warrantyDate}
                onChange={(e) => update("warrantyDate", e.target.value)}
              />
            </Field>
            <Field label="Condition notes">
              <Textarea
                value={form.conditionNotes}
                onChange={(e) => update("conditionNotes", e.target.value)}
              />
            </Field>
            <Button className="w-full" disabled={pending}>
              {pending ? "Creating..." : "Create asset"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
