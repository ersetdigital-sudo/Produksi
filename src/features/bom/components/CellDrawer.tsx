"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { saveCell } from "../actions";
import type {
  BomCellView,
  BomMaterialOption,
  BomRowView,
  BomSeries,
} from "../queries";
import styles from "./bom.module.css";

export function CellDrawer({
  cell,
  row,
  series,
  sizes,
  materials,
  onClose,
  onSaved,
}: {
  cell: BomCellView;
  row: BomRowView;
  series: BomSeries;
  sizes: string[];
  materials: BomMaterialOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unused, setUnused] = useState(cell.unused);
  const [qty, setQty] = useState(cell.qty === null ? "" : String(cell.qty));
  const [materialId, setMaterialId] = useState(cell.materialId ?? "");
  const [sizeValues, setSizeValues] = useState<
    Record<string, { materialId: string; qty: string }>
  >(() => {
    const initial: Record<string, { materialId: string; qty: string }> = {};
    for (const size of sizes) {
      const existing = cell.sizes.find((item) => item.size === size);
      initial[size] = {
        materialId: existing?.materialId ?? "",
        qty:
          existing?.qty === null || existing?.qty === undefined
            ? ""
            : String(existing.qty),
      };
    }
    return initial;
  });

  const isSize = row.pattern === "size";
  const isColor = row.pattern === "warna";
  const selectedMaterial = materials.find((item) => item.id === materialId);
  const unit = selectedMaterial?.unit ?? cell.unit ?? "pcs";

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveCell({
        cellId: cell.id,
        unused,
        qty: qty === "" ? null : Number(qty),
        materialId: isColor ? null : materialId || null,
        sizes: isSize
          ? sizes.map((size) => ({
              size,
              materialId: sizeValues[size]?.materialId || null,
              qty:
                sizeValues[size]?.qty === ""
                  ? null
                  : Number(sizeValues[size]?.qty),
            }))
          : undefined,
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
      title="Ubah isi"
      eyebrow={`${row.name} · ${series.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      {isColor ? (
        <Note tone="info">
          Kode mengikuti Katalog Warna untuk warna yang dipakai. Isi jumlah
          kebutuhan untuk 1 baju.
        </Note>
      ) : null}

      {isSize ? (
        <div className="col" style={{ gap: 8 }}>
          <span className="flabel">Label dan jumlah per size</span>
          <div className={styles.sizeRows}>
            {sizes.map((size) => (
              <div className={styles.sizeRow} key={size}>
                <span className={styles.sizeLabel}>{size}</span>
                <Select
                  aria-label={`Material size ${size}`}
                  value={sizeValues[size]?.materialId ?? ""}
                  onChange={(event) =>
                    setSizeValues((current) => ({
                      ...current,
                      [size]: {
                        materialId: event.target.value,
                        qty: current[size]?.qty ?? "",
                      },
                    }))
                  }
                >
                  <option value="">Belum diisi</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.label}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={`Jumlah size ${size}`}
                  numeric
                  inputMode="decimal"
                  value={sizeValues[size]?.qty ?? ""}
                  placeholder="0"
                  onChange={(event) =>
                    setSizeValues((current) => ({
                      ...current,
                      [size]: {
                        materialId: current[size]?.materialId ?? "",
                        qty: event.target.value,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <span className="hint">Kosongkan size yang tidak dipakai.</span>
        </div>
      ) : (
        <>
          {isColor ? null : (
            <Field label="Item" htmlFor="cell-material">
              <Select
                id="cell-material"
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                <option value="">Belum diisi</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={`Jumlah per baju (${unit})`} htmlFor="cell-qty">
            <Input
              id="cell-qty"
              numeric
              inputMode="decimal"
              value={qty}
              placeholder="0"
              onChange={(event) => setQty(event.target.value)}
            />
          </Field>
        </>
      )}

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={unused}
          onChange={(event) => setUnused(event.target.checked)}
        />
        <span>
          <b style={{ fontSize: 14 }}>Tidak dipakai di series ini</b>
          <span className="sub" style={{ display: "block" }}>
            Misalnya bagian ini tidak ada di model series tersebut.
          </span>
        </span>
      </label>
    </Drawer>
  );
}
