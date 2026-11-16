"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { createMaterial } from "../actions";
import type { MaterialCatalogData } from "../queries";
import styles from "./materials.module.css";

export function MaterialFormDrawer({
  open,
  types,
  onClose,
  onSaved,
}: {
  open: boolean;
  types: MaterialCatalogData["types"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [materialTypeId, setMaterialTypeId] = useState(types[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [minStock, setMinStock] = useState("");

  const selectedType = types.find((type) => type.id === materialTypeId);
  const unit = selectedType?.unit ?? "pcs";

  const submit = () => {
    setError(null);
    if (!materialTypeId) {
      setError("Jenis material wajib dipilih.");
      return;
    }
    if (!code.trim() && !name.trim()) {
      setError("Isi kode atau nama material.");
      return;
    }

    startTransition(async () => {
      const result = await createMaterial({
        materialTypeId,
        code,
        name,
        initialStock: initialStock === "" ? 0 : Number(initialStock),
        minStock: minStock === "" ? undefined : Number(minStock),
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
      open={open}
      onClose={onClose}
      title="Tambah material"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan material"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      <Field
        label="Jenis material"
        htmlFor="material-type"
        hint="Satuan mengikuti jenis ini."
      >
        <Select
          id="material-type"
          value={materialTypeId}
          onChange={(event) => setMaterialTypeId(event.target.value)}
        >
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className={styles.formRow}>
        <Field label="Kode" htmlFor="material-code">
          <Input
            id="material-code"
            mono
            value={code}
            placeholder="Misalnya: 722"
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="Nama / Brand (opsional)" htmlFor="material-name">
          <Input
            id="material-name"
            value={name}
            placeholder="Misalnya: Hitam"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label={`Stok awal (${unit})`} htmlFor="material-stock">
          <Input
            id="material-stock"
            numeric
            inputMode="decimal"
            value={initialStock}
            placeholder="0"
            onChange={(event) => setInitialStock(event.target.value)}
          />
        </Field>
        <Field
          label={`Minimum (${unit})`}
          htmlFor="material-min"
          hint={
            selectedType
              ? `Bawaan jenis ini: ${selectedType.defaultMin} ${unit}`
              : undefined
          }
        >
          <Input
            id="material-min"
            numeric
            inputMode="decimal"
            value={minStock}
            placeholder={String(selectedType?.defaultMin ?? 0)}
            onChange={(event) => setMinStock(event.target.value)}
          />
        </Field>
      </div>

      <p className="sub">
        Di bawah angka minimum, status berubah jadi &quot;Menipis&quot;.
      </p>

      <Note tone="info">
        Material baru belum dipasangkan ke warna mana pun. Pasangkan sebagai
        kode utama atau pengganti lewat Katalog Warna.
      </Note>
    </Drawer>
  );
}
