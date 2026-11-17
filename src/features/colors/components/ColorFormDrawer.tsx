"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { PhotoField, type PhotoValue } from "@/features/photos/components/PhotoField";
import { saveColor } from "../actions";
import type { ColorCatalogData, ColorView, SlotView } from "../queries";
import styles from "./colors.module.css";

type PairingState = Record<string, { primary: string; backup: string }>;

function initialPairings(
  data: ColorCatalogData,
  color: ColorView | null,
): PairingState {
  const state: PairingState = {};
  for (const slot of data.slots) {
    const existing = color?.pairings.find(
      (pairing) => pairing.slotId === slot.id,
    );
    state[slot.id] = {
      primary: existing?.primary?.id ?? "",
      backup: existing?.backup?.id ?? "",
    };
  }
  return state;
}

function materialOptionLabel(slot: SlotView, materialId: string): string | null {
  const material = slot.materials.find((item) => item.id === materialId);
  if (!material) return null;
  return [material.code, material.name].filter(Boolean).join(" · ");
}

export function ColorFormDrawer({
  open,
  color,
  data,
  onClose,
  onSaved,
}: {
  open: boolean;
  color: ColorView | null;
  data: ColorCatalogData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(color?.name ?? "");
  const [fabricTypeId, setFabricTypeId] = useState(
    color?.fabricId ?? data.fabrics[0]?.id ?? "",
  );
  const [colorCode, setColorCode] = useState(color?.colorCode ?? "");
  const [photo, setPhoto] = useState<PhotoValue>({
    path: color?.photoPath ?? null,
    url: color?.photoUrl ?? null,
  });
  const [productIds, setProductIds] = useState<string[]>(
    color
      ? color.products.map((product) => product.id)
      : data.products
          .filter((product) => ["thobe", "kandora"].includes(product.slug))
          .map((product) => product.id),
  );
  const [pairings, setPairings] = useState<PairingState>(() =>
    initialPairings(data, color),
  );

  const toggleProduct = (productId: string) => {
    setProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const setPairing = (
    slotId: string,
    field: "primary" | "backup",
    value: string,
  ) => {
    setPairings((current) => ({
      ...current,
      [slotId]: {
        primary: current[slotId]?.primary ?? "",
        backup: current[slotId]?.backup ?? "",
        [field]: value,
      },
    }));
  };

  const submit = () => {
    setError(null);

    if (!name.trim()) {
      setError("Nama warna wajib diisi.");
      return;
    }
    if (!fabricTypeId) {
      setError("Jenis kain wajib dipilih.");
      return;
    }
    if (!colorCode.trim()) {
      setError("Kode warna kain wajib diisi.");
      return;
    }

    for (const slot of data.slots) {
      const value = pairings[slot.id];
      if (!value?.primary && value?.backup) {
        setError(`Isi kode utama ${slot.name} dulu sebelum kode cadangan.`);
        return;
      }
      if (value?.primary && value.primary === value.backup) {
        setError(`Kode cadangan ${slot.name} harus berbeda dari kode utama.`);
        return;
      }
    }

    startTransition(async () => {
      const result = await saveColor({
        id: color?.id,
        name,
        fabricTypeId,
        colorCode,
        photoPath: photo.path,
        productIds,
        pairings: data.slots.map((slot) => ({
          slotId: slot.id,
          primaryMaterialId: pairings[slot.id]?.primary || null,
          backupMaterialId: pairings[slot.id]?.backup || null,
        })),
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
      title={color ? `Ubah pasangan ${color.name}` : "Tambah warna"}
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

      <div className={styles.formTop}>
        <div className={styles.photoSlot}>
          <PhotoField
            label="Foto kain"
            prefix="colors"
            value={photo}
            onChange={setPhoto}
          />
        </div>
        <Field label="Warna Kain" htmlFor="color-name" className="grow">
          <Input
            id="color-name"
            value={name}
            placeholder="Misalnya: Latte"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>

      <div className="g2" style={{ gap: 12 }}>
        <Field label="Jenis Kain" htmlFor="color-fabric">
          <Select
            id="color-fabric"
            value={fabricTypeId}
            onChange={(event) => setFabricTypeId(event.target.value)}
          >
            {data.fabrics.map((fabric) => (
              <option key={fabric.id} value={fabric.id}>
                {fabric.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kode Warna Kain" htmlFor="color-code">
          <Input
            id="color-code"
            mono
            value={colorCode}
            placeholder="Col#"
            onChange={(event) => setColorCode(event.target.value)}
          />
        </Field>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="flabel">Jenis Produk</span>
        <div
          className="row wrap"
          style={{ gap: 8 }}
          role="group"
          aria-label="Jenis Produk"
        >
          {data.products.map((product) => {
            const selected = productIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                className={`chip ${selected ? "on" : ""}`}
                aria-pressed={selected}
                onClick={() => toggleProduct(product.id)}
              >
                {product.name}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="hr" />

      <div className="col" style={{ gap: 10 }}>
        <div>
          <h3 className="h3">Pasangan</h3>
          <p className="sub">
            Kode cadangan boleh dikosongkan. Yang belum tahu bisa diisi nanti.
          </p>
        </div>

        <div className={styles.formPairHead} aria-hidden="true">
          <span />
          <span className="lbl">Kode utama</span>
          <span className="lbl">Kode cadangan</span>
        </div>

        {data.slots.map((slot) => {
          const value = pairings[slot.id];
          return (
            <div className={styles.formPairRow} key={slot.id}>
              <span className={styles.pairingLabelText}>{slot.name}</span>
              <Select
                aria-label={`${slot.name}, kode utama`}
                value={value?.primary ?? ""}
                onChange={(event) =>
                  setPairing(slot.id, "primary", event.target.value)
                }
              >
                <option value="">Belum diisi</option>
                {slot.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {materialOptionLabel(slot, material.id)}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={`${slot.name}, kode cadangan`}
                value={value?.backup ?? ""}
                onChange={(event) =>
                  setPairing(slot.id, "backup", event.target.value)
                }
              >
                <option value="">Tanpa cadangan</option>
                {slot.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {materialOptionLabel(slot, material.id)}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
