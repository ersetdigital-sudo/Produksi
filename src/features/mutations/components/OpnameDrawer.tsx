"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { formatQty } from "@/lib/format";
import { recordOpname } from "../actions";
import type { MutationData } from "../queries";
import styles from "./mutations.module.css";

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function OpnameDrawer({
  data,
  onClose,
  onSaved,
}: {
  data: MutationData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [materialId, setMaterialId] = useState(data.materials[0]?.id ?? "");
  const [countedQty, setCountedQty] = useState("");
  const [reason, setReason] = useState("");

  const material = data.materials.find((item) => item.id === materialId);
  const counted = Number(countedQty || 0);
  const delta = material ? counted - material.stock : 0;

  const submit = () => {
    setError(null);
    if (!materialId) {
      setError("Material wajib dipilih.");
      return;
    }
    if (countedQty === "" || counted < 0) {
      setError("Isi hasil hitung di rak.");
      return;
    }

    startTransition(async () => {
      const result = await recordOpname({
        date,
        materialId,
        countedQty: counted,
        reason,
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
      title="Opname stok"
      variant="bottom"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan opname"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      <p className="sub">
        Hitung barang di rak, lalu isi jumlah sebenarnya. Selisihnya dicatat
        otomatis.
      </p>

      <Field label="Tanggal" htmlFor="opname-date">
        <Input
          id="opname-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>

      <Field label="Material" htmlFor="opname-material">
        <Select
          id="opname-material"
          value={materialId}
          onChange={(event) => setMaterialId(event.target.value)}
        >
          {data.materials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.typeName} · {item.label} · tercatat {formatQty(item.stock)}{" "}
              {item.unit}
            </option>
          ))}
        </Select>
      </Field>

      <div className={styles.materialGrid}>
        <div
          style={{
            background: "var(--sf2)",
            border: "1px solid var(--ln)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div className="lbl">Stok tercatat</div>
          <div className={styles.stockPreview}>
            {formatQty(material?.stock ?? 0)}
            <span>{material?.unit}</span>
          </div>
        </div>
        <Field
          label={`Hasil hitung (${material?.unit ?? ""})`}
          htmlFor="opname-counted"
        >
          <Input
            id="opname-counted"
            numeric
            inputMode="decimal"
            value={countedQty}
            placeholder="0"
            onChange={(event) => setCountedQty(event.target.value)}
          />
        </Field>
      </div>

      {countedQty !== "" ? (
        <Note tone={delta === 0 ? "info" : "warning"}>
          Selisih {delta > 0 ? "+" : ""}
          {formatQty(delta)} {material?.unit}. Stok disesuaikan jadi{" "}
          {formatQty(counted)} {material?.unit}.
        </Note>
      ) : null}

      <Field label="Alasan selisih (opsional)" htmlFor="opname-reason">
        <Textarea
          id="opname-reason"
          rows={2}
          value={reason}
          placeholder="Misalnya: lupa dicatat saat dipakai"
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
    </Drawer>
  );
}
