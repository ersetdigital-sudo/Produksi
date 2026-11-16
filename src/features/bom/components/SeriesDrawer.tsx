"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { addSeries } from "../actions";
import type { BomMaterialOption, BomSeries } from "../queries";
import styles from "./bom.module.css";

export function SeriesDrawer({
  productId,
  productName,
  productionSeries,
  accessoryMaterials,
  onClose,
  onSaved,
}: {
  productId: string;
  productName: string;
  productionSeries: BomSeries[];
  accessoryMaterials: BomMaterialOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"diproduksi" | "turunan">("diproduksi");
  const [copyFrom, setCopyFrom] = useState(
    productionSeries[0]?.id ?? "",
  );
  const [parentId, setParentId] = useState(
    productionSeries[0]?.id ?? "",
  );
  const [accessoryId, setAccessoryId] = useState(
    accessoryMaterials[0]?.id ?? "",
  );
  const [accessoryQty, setAccessoryQty] = useState("");

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama series wajib diisi.");
      return;
    }
    if (kind === "turunan" && !parentId) {
      setError("Series induk wajib dipilih.");
      return;
    }
    if (kind === "turunan" && !accessoryId) {
      setError("Aksesoris tambahan wajib dipilih.");
      return;
    }

    startTransition(async () => {
      const result = await addSeries({
        productId,
        name,
        kind,
        copyFromSeriesId: kind === "diproduksi" ? copyFrom || null : null,
        parentSeriesId: kind === "turunan" ? parentId : null,
        accessoryMaterialId: kind === "turunan" ? accessoryId : null,
        accessoryQty:
          kind === "turunan" && accessoryQty !== ""
            ? Number(accessoryQty)
            : null,
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
      title={`Tambah series ${productName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Tambah series"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      <Field label="Nama series" htmlFor="series-name">
        <Input
          id="series-name"
          value={name}
          placeholder="Misalnya: Edisi Ramadhan"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <div className="col" style={{ gap: 6 }}>
        <span className="flabel">Jenis series</span>
        <SegmentedControl
          items={[
            { value: "diproduksi", label: "Diproduksi" },
            { value: "turunan", label: "Turunan" },
          ]}
          value={kind}
          onChange={(value) => setKind(value as "diproduksi" | "turunan")}
          ariaLabel="Jenis series"
          className=""
        />
      </div>

      {kind === "diproduksi" ? (
        <div className="col" style={{ gap: 14 }}>
          <Field
            label="Salin isi bahan dari"
            htmlFor="series-copy"
            hint="Semua baris disalin, lalu tinggal ubah sel yang berbeda, misalnya kain keras kerah."
          >
            <Select
              id="series-copy"
              value={copyFrom}
              onChange={(event) => setCopyFrom(event.target.value)}
              disabled={productionSeries.length === 0}
            >
              <option value="">Kosongkan semua</option>
              {productionSeries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          {productionSeries.length === 0 ? (
            <p className="sub">
              Belum ada series diproduksi. Series baru akan dimulai dengan sel
              kosong.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          <Field
            label="Diambil dari series"
            htmlFor="series-parent"
            hint="Series induk harus series diproduksi."
          >
            <Select
              id="series-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              disabled={productionSeries.length === 0}
            >
              {productionSeries.length === 0 ? (
                <option value="">Belum ada series induk</option>
              ) : null}
              {productionSeries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className={styles.formGrid}>
            <Field label="Aksesoris tambahan" htmlFor="series-accessory">
              <Select
                id="series-accessory"
                value={accessoryId}
                onChange={(event) => setAccessoryId(event.target.value)}
                disabled={accessoryMaterials.length === 0}
              >
                {accessoryMaterials.length === 0 ? (
                  <option value="">Belum ada aksesoris</option>
                ) : null}
                {accessoryMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Jumlah per baju" htmlFor="series-accessory-qty">
              <Input
                id="series-accessory-qty"
                numeric
                inputMode="decimal"
                value={accessoryQty}
                placeholder="Belum diisi"
                onChange={(event) => setAccessoryQty(event.target.value)}
              />
            </Field>
          </div>

          <p className="sub">
            Series turunan tidak muncul di Jadwal Produksi. Aksesorisnya
            terpotong saat dicatat di Pasang Aksesoris.
          </p>
        </div>
      )}
    </Drawer>
  );
}
