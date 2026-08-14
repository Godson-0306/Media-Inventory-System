"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createEquipment, deleteEquipment, updateEquipment } from "@/actions/equipment";
import { seedSampleKit } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  EquipmentForm,
  dateInputValue,
  emptyEquipmentForm,
  type EquipmentFormValues,
} from "@/components/admin/equipment-form";
import { capReached, formatCap } from "@/lib/plans";
import { statusLabel } from "@/lib/utils";
import type { EquipmentDTO } from "@/lib/types";

export function EquipmentAdmin({
  equipment,
  maxItems,
}: {
  equipment: EquipmentDTO[];
  maxItems: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<EquipmentFormValues>(emptyEquipmentForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const atCap = !editingId && capReached(equipment.length, maxItems);

  function update(key: keyof EquipmentFormValues, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(item: EquipmentDTO) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      serialNumber: item.serialNumber,
      brand: item.brand,
      model: item.model,
      category: item.category,
      purchaseDate: dateInputValue(item.purchaseDate),
      warrantyDate: dateInputValue(item.warrantyDate),
      conditionNotes: item.conditionNotes,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyEquipmentForm);
  }

  function confirmDelete(item: EquipmentDTO) {
    const ok = window.confirm(`Delete ${item.name} (${item.serialNumber})? This cannot be undone.`);
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteEquipment({ id: item.id });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Asset deleted");
        if (editingId === item.id) resetForm();
      }
    });
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
            <span className="text-sm text-muted-foreground">
              {formatCap(equipment.length, maxItems, "items")}
            </span>
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
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                >
                  <Link href={`/admin/equipment/${item.id}`} className="min-w-0 flex-1 hover:opacity-80">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.serialNumber} · {item.brand} {item.model}
                      {item.locationLabel ? ` · ${item.locationLabel}` : ""}
                    </p>
                  </Link>
                  <span className="shrink-0 text-xs uppercase text-primary">
                    {statusLabel(item.status)}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => confirmDelete(item)}
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
          <h2 className="mb-4 font-medium">{editingId ? "Edit equipment" : "Add equipment"}</h2>
          {atCap ? (
            <p className="mb-3 text-sm text-amber-600 dark:text-amber-200">
              This plan is at its item cap. Delete an asset or upgrade to add more.
            </p>
          ) : null}
          <EquipmentForm
            form={form}
            onChange={update}
            pending={pending}
            disabled={atCap}
            submitLabel={editingId ? "Save changes" : "Create asset"}
            onCancel={editingId ? resetForm : undefined}
            onSubmit={() =>
              startTransition(async () => {
                const result = editingId
                  ? await updateEquipment({ id: editingId, ...form })
                  : await createEquipment(form);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(editingId ? "Asset updated" : "Asset created");
                resetForm();
              })
            }
          />
        </Card>
      </div>
    </div>
  );
}
