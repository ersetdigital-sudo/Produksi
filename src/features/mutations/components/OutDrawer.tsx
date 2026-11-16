"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/ui/badges";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note, Swatch } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { resolveOutboundMaterial } from "@/features/stock/outbound";
import { formatQty } from "@/lib/format";
import { recordManualOut } from "../actions";
import type { MutationData } from "../queries";
import styles from "./mutations.module.css";

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function OutDrawer({
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
  const [mode, setMode] = useState<"warna" | "material">("warna");
  const [colorId, setColorId] = useState(data.colors[0]?.id ?? "");
  const [qtyBySlot, setQtyBySlot] = useState<Record<string, string>>({});
  const [backupBySlot, setBackupBySlot] = useState<Record<string, boolean>>({});
  const [materialTypeId, setMaterialTypeId] = useState(
    data.types[0]?.id ?? "",
  );
  const [materialId, setMaterialId] = useState(
    data.materials.find((item) => item.typeId === data.types[0]?.id)?.id ?? "",
  );
  const [materialQty, setMaterialQty] = useState("");
  const [materialColorId, setMaterialColorId] = useState("");
  const [note, setNote] = useState("");

  const color = data.colors.find((item) => item.id === colorId);
  const material = data.materials.find((item) => item.id === materialId);
  const typeMaterials = data.materials.filter(
    (item) => item.typeId === materialTypeId,
  );

  const warnings: string[] = [];
  for (const pairing of color?.pairings ?? []) {
    const qty = Number(qtyBySlot[pairing.slotId] ?? 0);
    if (qty <= 0) continue;
    const useBackup = Boolean(backupBySlot[pairing.slotId]);
    const choice = resolveOutboundMaterial(
      {
        primaryMaterialId: pairing.primary?.id ?? null,
        backupMaterialId: pairing.backup?.id ?? null,
        primaryStock: pairing.primary?.stock ?? 0,
        backupStock: pairing.backup?.stock ?? 0,
      },
      useBackup,
    );
    const selected = choice.usedBackup ? pairing.backup : pairing.primary;
    if (selected && qty > selected.stock) {
      warnings.push(
        `${pairing.slotName} ${selected.code ?? selected.name}: kurang ${formatQty(
          qty - selected.stock,
        )} ${selected.unit}`,
      );
    }
  }

  const materialQtyNumber = Number(materialQty || 0);
  if (mode === "material" && material && materialQtyNumber > material.stock) {
    warnings.push(
      `${material.label}: kurang ${formatQty(
        materialQtyNumber - material.stock,
      )} ${material.unit}`,
    );
  }

  const submit = () => {
    setError(null);
    const items: {
      materialId: string;
      qty: number;
      colorId: string | null;
      usedBackup: boolean;
    }[] = [];

    if (mode === "warna") {
      if (!color) {
        setError("Warna kain wajib dipilih.");
        return;
      }
      for (const pairing of color.pairings) {
        const qty = Number(qtyBySlot[pairing.slotId] ?? 0);
        if (qty <= 0) continue;
        const useBackup = Boolean(backupBySlot[pairing.slotId]);
        const choice = resolveOutboundMaterial(
          {
            primaryMaterialId: pairing.primary?.id ?? null,
            backupMaterialId: pairing.backup?.id ?? null,
            primaryStock: pairing.primary?.stock ?? 0,
            backupStock: pairing.backup?.stock ?? 0,
          },
          useBackup,
        );
        if (!choice.materialId) {
          setError(
            `${pairing.slotName} belum punya kode. Isi dulu di Katalog Warna.`,
          );
          return;
        }
        items.push({
          materialId: choice.materialId,
          qty,
          colorId,
          usedBackup: choice.usedBackup,
        });
      }
    } else {
      if (!materialId) {
        setError("Material wajib dipilih.");
        return;
      }
      if (materialQtyNumber <= 0) {
        setError("Jumlah keluar harus lebih dari 0.");
        return;
      }
      items.push({
        materialId,
        qty: materialQtyNumber,
        colorId: materialColorId || null,
        usedBackup: false,
      });
    }

    if (items.length === 0) {
      setError("Isi minimal satu jumlah keluar.");
      return;
    }

    startTransition(async () => {
      const result = await recordManualOut({
        date,
        note,
        items,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      router.refresh();
    });
  };

  const setQty = (slotId: string, value: string) => {
    setQtyBySlot((current) => ({ ...current, [slotId]: value }));
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Catat barang keluar"
      variant="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan barang keluar"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      <div className="row sp wrap">
        <Field label="Tanggal" htmlFor="out-date" className="grow">
          <Input
            id="out-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <div className="col" style={{ gap: 6 }}>
          <span className="flabel">Cara mencatat</span>
          <SegmentedControl
            items={[
              { value: "warna", label: "Per warna" },
              { value: "material", label: "Per material" },
            ]}
            value={mode}
            onChange={(value) => setMode(value as "warna" | "material")}
            ariaLabel="Cara mencatat"
          />
        </div>
      </div>

      {mode === "warna" ? (
        <div className="col" style={{ gap: 14 }}>
          <Field label="Warna kain" htmlFor="out-color">
            <Select
              id="out-color"
              value={colorId}
              onChange={(event) => setColorId(event.target.value)}
            >
              {data.colors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.fabricCode} · {item.colorCode}
                </option>
              ))}
            </Select>
          </Field>

          {color ? (
            <div
              className="row"
              style={{
                background: "var(--sf2)",
                border: "1px solid var(--ln)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <Swatch
                color={color.hex}
                size={40}
                radius={8}
                label={`Foto kain ${color.name}`}
              />
              <p className="sub grow">
                Semua pasangan {color.name} muncul di bawah. Isi jumlah yang
                keluar, kosongkan yang tidak dipakai.
              </p>
            </div>
          ) : null}

          <div>
            <div className="row sp" style={{ paddingBottom: 8 }}>
              <span className="lbl">Pasangan dan kode yang dipakai</span>
              <span className="lbl" style={{ width: 150 }}>
                Jumlah keluar
              </span>
            </div>

            {(color?.pairings ?? []).map((pairing) => {
              const useBackup = Boolean(backupBySlot[pairing.slotId]);
              const selected = useBackup ? pairing.backup : pairing.primary;
              const canUseBackup =
                Boolean(pairing.primary) &&
                pairing.primary!.stock <= 0 &&
                Boolean(pairing.backup);

              return (
                <div className={styles.pairRow} key={pairing.slotId}>
                  <div className={styles.pairInfo}>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <b>{pairing.slotName}</b>
                      <StatusBadge status={pairing.status} />
                    </div>
                    {pairing.primary ? (
                      <div className="sub">
                        {useBackup
                          ? `Memakai cadangan ${pairing.backup?.code ?? ""} · sisa ${formatQty(
                              pairing.backup?.stock ?? 0,
                            )} ${pairing.backup?.unit ?? ""}`
                          : `Utama ${pairing.primary.code ?? pairing.primary.name} · sisa ${formatQty(
                              pairing.primary.stock,
                            )} ${pairing.primary.unit}`}
                      </div>
                    ) : (
                      <div className="sub">
                        <span className="ph">[kode]</span> · belum diisi di
                        Katalog Warna
                      </div>
                    )}

                    {canUseBackup && !useBackup ? (
                      <div className="note note-wr" style={{ alignItems: "center" }}>
                        <div className="grow">
                          Kode utama {pairing.primary?.code} habis. Cadangan{" "}
                          {pairing.backup?.code} tersedia{" "}
                          {formatQty(pairing.backup?.stock ?? 0)}{" "}
                          {pairing.backup?.unit}.
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setBackupBySlot((current) => ({
                              ...current,
                              [pairing.slotId]: true,
                            }))
                          }
                        >
                          Pakai cadangan
                        </Button>
                      </div>
                    ) : null}

                    {useBackup ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        style={{ alignSelf: "flex-start", padding: 0 }}
                        onClick={() =>
                          setBackupBySlot((current) => ({
                            ...current,
                            [pairing.slotId]: false,
                          }))
                        }
                      >
                        Batalkan pakai cadangan
                      </Button>
                    ) : null}
                  </div>

                  <div className={styles.qty}>
                    <Input
                      aria-label={`Jumlah keluar ${pairing.slotName}`}
                      numeric
                      inputMode="decimal"
                      placeholder="0"
                      value={qtyBySlot[pairing.slotId] ?? ""}
                      disabled={!pairing.primary}
                      onChange={(event) =>
                        setQty(pairing.slotId, event.target.value)
                      }
                    />
                    <span>{selected?.unit ?? pairing.primary?.unit ?? ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          <div className={styles.materialGrid}>
            <Field label="Jenis material" htmlFor="out-type">
              <Select
                id="out-type"
                value={materialTypeId}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setMaterialTypeId(nextType);
                  setMaterialId(
                    data.materials.find((item) => item.typeId === nextType)
                      ?.id ?? "",
                  );
                }}
              >
                {data.types.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kode" htmlFor="out-code">
              <Select
                id="out-code"
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                {typeMaterials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · sisa {formatQty(item.stock)} {item.unit}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className={styles.materialGrid}>
            <Field label="Jumlah keluar" htmlFor="out-qty">
              <div className={styles.qty}>
                <Input
                  id="out-qty"
                  numeric
                  inputMode="decimal"
                  value={materialQty}
                  placeholder="0"
                  onChange={(event) => setMaterialQty(event.target.value)}
                />
                <span>{material?.unit ?? ""}</span>
              </div>
            </Field>
            <Field label="Untuk warna (opsional)" htmlFor="out-color-link">
              <Select
                id="out-color-link"
                value={materialColorId}
                onChange={(event) => setMaterialColorId(event.target.value)}
              >
                <option value="">Tidak terkait warna tertentu</option>
                {data.colors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.fabricCode} · {item.colorCode}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}

      {warnings.length > 0 ? (
        <Note tone="warning">
          Stok kurang: {warnings.join("; ")}. Tetap bisa disimpan: stok tercatat
          minus dan ditandai untuk opname.
        </Note>
      ) : null}

      <Field label="Catatan (opsional)" htmlFor="out-note">
        <Textarea
          id="out-note"
          rows={2}
          value={note}
          placeholder="Misalnya: untuk produksi minggu ini"
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </Drawer>
  );
}
