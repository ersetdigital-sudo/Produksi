"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { convertQuantity } from "@/features/stock/units";
import { formatQty } from "@/lib/format";
import { recordManualIn } from "../actions";
import type { MutationData, MutationMaterialOption } from "../queries";
import styles from "./mutations.module.css";

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function InDrawer({
  data,
  onClose,
  onSaved,
  initialMaterialId,
}: {
  data: MutationData;
  onClose: () => void;
  onSaved: () => void;
  initialMaterialId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const initial = data.materials.find((m) => m.id === initialMaterialId) ?? data.materials[0];
  const [materialId, setMaterialId] = useState(initial?.id ?? "");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState(initial?.unit ?? "pcs");
  const [note, setNote] = useState("");

  const material: MutationMaterialOption | undefined = data.materials.find(
    (item) => item.id === materialId,
  );

  const unitOptions = Array.from(
    new Set([
      material?.unit ?? "pcs",
      ...data.conversions
        .filter(
          (item) =>
            item.toUnit === material?.unit || item.fromUnit === material?.unit,
        )
        .flatMap((item) => [item.fromUnit, item.toUnit]),
    ]),
  );

  const qtyNumber = Number(qty || 0);
  let converted: number | null = null;
  if (material && qtyNumber > 0) {
    try {
      converted = convertQuantity(
        qtyNumber,
        unit,
        material.unit,
        data.conversions,
      );
    } catch {
      converted = null;
    }
  }

  const selectMaterial = (nextId: string) => {
    setMaterialId(nextId);
    const next = data.materials.find((item) => item.id === nextId);
    setUnit(next?.unit ?? "pcs");
  };

  const submit = () => {
    setError(null);
    if (!materialId) {
      setError("Material wajib dipilih.");
      return;
    }
    if (!qtyNumber || qtyNumber <= 0) {
      setError("Jumlah masuk harus lebih dari 0.");
      return;
    }

    startTransition(async () => {
      const result = await recordManualIn({
        date,
        materialId,
        qty: qtyNumber,
        unit,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      router.refresh();
    });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Catat barang masuk"
      variant="bottom"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan barang masuk"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      <Field label="Tanggal" htmlFor="in-date">
        <Input
          id="in-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>

      <Field label="Material" htmlFor="in-material">
        <Select
          id="in-material"
          value={materialId}
          onChange={(event) => selectMaterial(event.target.value)}
        >
          {data.materials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.typeName} · {item.label} · sisa {formatQty(item.stock)}{" "}
              {item.unit}
            </option>
          ))}
        </Select>
      </Field>

      <div className={styles.materialGrid}>
        <Field label="Jumlah masuk" htmlFor="in-qty">
          <Input
            id="in-qty"
            numeric
            inputMode="decimal"
            value={qty}
            placeholder="0"
            onChange={(event) => setQty(event.target.value)}
          />
        </Field>
        <Field label="Satuan" htmlFor="in-unit">
          <Select
            id="in-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          >
            {unitOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {converted !== null && material ? (
        <Note tone="info">
          {formatQty(qtyNumber)} {unit} ={" "}
          <b>
            {formatQty(converted)} {material.unit}
          </b>
          . Stok {material.label} jadi{" "}
          {formatQty(material.stock + converted)} {material.unit}.
        </Note>
      ) : null}

      <Field label="Catatan (opsional)" htmlFor="in-note">
        <Textarea
          id="in-note"
          rows={2}
          value={note}
          placeholder="Misalnya: beli di [nama toko]"
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </Drawer>
  );
}
