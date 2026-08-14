"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/constants";

export type EquipmentFormValues = {
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  category: string;
  purchaseDate: string;
  warrantyDate: string;
  conditionNotes: string;
};

export const emptyEquipmentForm: EquipmentFormValues = {
  name: "",
  serialNumber: "",
  brand: "",
  model: "",
  category: "CAMERAS",
  purchaseDate: "",
  warrantyDate: "",
  conditionNotes: "",
};

export function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function EquipmentForm({
  form,
  onChange,
  onSubmit,
  pending,
  submitLabel,
  onCancel,
  disabled,
}: {
  form: EquipmentFormValues;
  onChange: (key: keyof EquipmentFormValues, value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  submitLabel: string;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Equipment name">
        <Input
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          required
          disabled={disabled}
        />
      </Field>
      <Field label="Serial number">
        <Input
          value={form.serialNumber}
          onChange={(e) => onChange("serialNumber", e.target.value)}
          required
          disabled={disabled}
        />
      </Field>
      <Field label="Brand">
        <Input
          value={form.brand}
          onChange={(e) => onChange("brand", e.target.value)}
          required
          disabled={disabled}
        />
      </Field>
      <Field label="Model">
        <Input
          value={form.model}
          onChange={(e) => onChange("model", e.target.value)}
          required
          disabled={disabled}
        />
      </Field>
      <Field label="Select category">
        <Select
          value={form.category}
          onChange={(e) => onChange("category", e.target.value)}
          disabled={disabled}
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
          onChange={(e) => onChange("purchaseDate", e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field label="Warranty date">
        <Input
          type="date"
          value={form.warrantyDate}
          onChange={(e) => onChange("warrantyDate", e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field label="Condition notes">
        <Textarea
          value={form.conditionNotes}
          onChange={(e) => onChange("conditionNotes", e.target.value)}
          disabled={disabled}
        />
      </Field>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={pending || disabled}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
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
