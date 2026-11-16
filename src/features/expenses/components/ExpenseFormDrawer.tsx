"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { convertQuantity } from "@/features/stock/units";
import { formatCurrency, formatQty } from "@/lib/format";
import { recordExpense } from "../actions";
import type { ExpenseLookup } from "../queries";
import styles from "./expenses.module.css";

type Line = {
  key: number;
  materialId: string;
  qty: string;
  unit: string;
  price: string;
};

let nextLineKey = 1;

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ExpenseFormDrawer({
  lookup,
  onClose,
  onSaved,
}: {
  lookup: ExpenseLookup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [categoryId, setCategoryId] = useState(
    lookup.categories[0]?.id ?? "",
  );
  const [machineId, setMachineId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [
    { key: nextLineKey++, materialId: lookup.materials[0]?.id ?? "", qty: "", unit: lookup.materials[0]?.unit ?? "pcs", price: "" },
  ]);

  const category = useMemo(
    () => lookup.categories.find((item) => item.id === categoryId) ?? null,
    [categoryId, lookup.categories],
  );

  const isPurchase = Boolean(category?.isPurchase);

  const unitOptions = useMemo(() => {
    const all = new Set<string>();
    for (const conversion of lookup.conversions) {
      all.add(conversion.fromUnit);
      all.add(conversion.toUnit);
    }
    for (const material of lookup.materials) all.add(material.unit);
    return Array.from(all);
  }, [lookup]);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const price = Number(line.price || 0);
        return sum + (Number.isFinite(price) ? price : 0);
      }, 0),
    [lines],
  );

  const lineStockText = (line: Line): string => {
    const material = lookup.materials.find(
      (item) => item.id === line.materialId,
    );
    if (!material) return "";
    const qty = Number(line.qty || 0);
    if (qty <= 0) return "";
    try {
      const converted = convertQuantity(
        qty,
        line.unit || material.unit,
        material.unit,
        lookup.conversions,
      );
      return converted === qty
        ? `Masuk stok: ${formatQty(converted)} ${material.unit}`
        : `Masuk stok: ${formatQty(qty)} ${line.unit} = ${formatQty(
            converted,
          )} ${material.unit}`;
    } catch {
      return "Konversi belum diatur";
    }
  };

  const updateLine = (key: number, patch: Partial<Line>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      {
        key: nextLineKey++,
        materialId: lookup.materials[0]?.id ?? "",
        qty: "",
        unit: lookup.materials[0]?.unit ?? "pcs",
        price: "",
      },
    ]);
  };

  const removeLine = (key: number) => {
    setLines((current) => current.filter((line) => line.key !== key));
  };

  const submit = () => {
    setError(null);
    if (!categoryId) {
      setError("Kategori wajib dipilih.");
      return;
    }
    if (isPurchase && lines.length === 0) {
      setError("Pembelian bahan butuh minimal satu baris barang.");
      return;
    }
    if (!isPurchase && (Number(amount || 0) <= 0)) {
      setError("Jumlah (Rp) wajib diisi.");
      return;
    }

    const items = isPurchase
      ? lines
          .filter((line) => Number(line.qty || 0) > 0)
          .map((line) => {
            const material = lookup.materials.find(
              (item) => item.id === line.materialId,
            );
            const factor = (() => {
              try {
                return convertQuantity(
                  1,
                  line.unit || material?.unit || "pcs",
                  material?.unit || "pcs",
                  lookup.conversions,
                );
              } catch {
                return null;
              }
            })();
            return {
              materialId: line.materialId,
              qtyPurchase: Number(line.qty || 0),
              purchaseUnit: line.unit || material?.unit || "pcs",
              conversionFactor: factor,
              unitPrice: line.price ? Number(line.price) : null,
            };
          })
      : [];
    if (isPurchase && items.length === 0) {
      setError("Isi minimal satu jumlah barang.");
      return;
    }

    startTransition(async () => {
      const result = await recordExpense({
        date,
        categoryId,
        machineId: machineId || null,
        amount: isPurchase ? 0 : Number(amount || 0),
        description,
        items,
        receiptPath: null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      router.refresh();
    });
  };

  const needsMachine = Boolean(category?.name && category.name !== "Pembelian bahan");

  return (
    <Drawer
      open
      onClose={onClose}
      title="Catat pengeluaran"
      variant="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan pengeluaran"}
          </Button>
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      <div className="g2" style={{ gap: 14 }}>
        <Field label="Tanggal" htmlFor="expense-date">
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Kategori" htmlFor="expense-category">
          <Select
            id="expense-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {lookup.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {isPurchase ? (
        <div className="col" style={{ gap: 10 }}>
          <div>
            <span className="flabel">Barang yang dibeli</span>
            <p className="sub">
              Setiap baris otomatis masuk ke Mutasi Stok sebagai barang masuk.
              Satuan beli dikonversi ke satuan stok.
            </p>
          </div>

          <div className={`${styles.rowGrid} ${styles.rowHead}`}>
            <span>Item</span>
            <span>Jumlah</span>
            <span>Satuan beli</span>
            <span>Harga (Rp)</span>
            <span />
          </div>

          {lines.map((line) => (
            <div className={styles.rowGrid} key={line.key}>
              <Select
                aria-label="Item"
                className={styles.materialSelect}
                value={line.materialId}
                onChange={(event) =>
                  updateLine(line.key, { materialId: event.target.value })
                }
              >
                {lookup.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.label}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Jumlah"
                numeric
                inputMode="numeric"
                value={line.qty}
                placeholder="0"
                onChange={(event) => updateLine(line.key, { qty: event.target.value })}
              />
              <Select
                aria-label="Satuan beli"
                value={line.unit}
                onChange={(event) =>
                  updateLine(line.key, { unit: event.target.value })
                }
              >
                {unitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Harga"
                numeric
                inputMode="numeric"
                value={line.price}
                placeholder="0"
                style={{ textAlign: "right" }}
                onChange={(event) =>
                  updateLine(line.key, { price: event.target.value })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Hapus baris"
                onClick={() => removeLine(line.key)}
              >
                <svg className="i" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </Button>
              <span className={`sub ${styles.rowFoot}`}>
                {lineStockText(line)}
              </span>
            </div>
          ))}

          <Button
            variant="secondary"
            size="sm"
            style={{ alignSelf: "flex-start" }}
            onClick={addLine}
          >
            <svg className="i" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah barang
          </Button>

          <div
            className="row sp"
            style={{ borderTop: "1px solid var(--ln)", paddingTop: 10 }}
          >
            <b>Total</b>
            <b className="num" style={{ fontSize: 18 }}>
              {formatCurrency(String(total || 0))}
            </b>
          </div>
        </div>
      ) : (
        <>
          <div className="g2" style={{ gap: 14 }}>
            <Field label="Jumlah (Rp)" htmlFor="expense-amount">
              <Input
                id="expense-amount"
                numeric
                inputMode="numeric"
                value={amount}
                placeholder="0"
                style={{ textAlign: "right", fontWeight: 700 }}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label="Mesin" htmlFor="expense-machine">
              <Select
                id="expense-machine"
                value={machineId}
                onChange={(event) => setMachineId(event.target.value)}
              >
                <option value="">Tanpa mesin</option>
                {lookup.machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {needsMachine && category?.name === "Service mesin" ? (
            <p className="sub">
              Pilih mesin untuk Service mesin dan Sparepart, supaya otomatis
              masuk ke riwayat mesin itu.
            </p>
          ) : null}
        </>
      )}

      <Field label="Keterangan" htmlFor="expense-description">
        <Textarea
          id="expense-description"
          rows={2}
          value={description}
          placeholder="Apa yang dikerjakan atau dibeli"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <div className="col" style={{ gap: 6 }}>
        <span className="flabel">Foto nota (opsional)</span>
        <Button
          variant="secondary"
          className=""
          style={{
            height: 56,
            borderStyle: "dashed",
            borderColor: "var(--ln3)",
          }}
          type="button"
        >
          <svg className="i" viewBox="0 0 24 24">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Pilih atau ambil foto nota
        </Button>
      </div>
    </Drawer>
  );
}