"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import { Drawer } from "@/components/ui/Drawer";
import { Note } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateId, formatQty } from "@/lib/format";
import { recordAssemblyAction } from "../actions";
import type { AccessoriesData } from "../queries";
import styles from "./accessories.module.css";

function today(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function AccessoryPage({ data }: { data: AccessoriesData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [childId, setChildId] = useState(data.turunan[0]?.id ?? "");
  const [colorId, setColorId] = useState(
    data.colors.find((c) => c.name === "Superblack")?.id ??
      data.colors[0]?.id ??
      "",
  );
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState("1");
  const [orderNo, setOrderNo] = useState("");

  const child = data.turunan.find((s) => s.id === childId) ?? null;
  const parentId = child?.parentSeriesId ?? "";
  const parentName = child?.parentName ?? "—";

  const qtyNum = Math.max(0, Number(qty || 0));
  const butuh = (child?.accessoryQty ?? 0) * qtyNum;
  const accessory = data.accessories.find(
    (a) => a.id === child?.accessoryMaterialId,
  );
  const accessStock = accessory?.stock ?? 0;

  const rackKey = `${parentId}|${colorId}|${size}`;
  const rackQty =
    data.rack.find((r) => `${r.seriesId}|${r.colorId}|${r.size}` === rackKey)
      ?.qty ?? 0;
  const kurangRak = qtyNum > rackQty;
  const kurangAks = butuh > accessStock;

  const openDrawer = () => {
    setChildId(data.turunan[0]?.id ?? "");
    setColorId(data.colors[0]?.id ?? "");
    setSize(data.sizes[0] ?? "M");
    setQty("1");
    setOrderNo("");
    setError(null);
    setOpen(true);
  };

  const submit = () => {
    setError(null);
    if (!child) {
      setError("Pilih series turunan.");
      return;
    }
    if (!parentId) {
      setError("Series induk tidak ditemukan.");
      return;
    }
    startAssembly();
  };

  const startAssembly = async () => {
    setPending(true);
    const res = await recordAssemblyAction({
      date: today(),
      childSeriesId: childId,
      parentSeriesId: parentId,
      colorId,
      size,
      qty: qtyNum,
      orderNo,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  const history = data.history;

  return (
    <>
      <PageHeader
        title="Pasang Aksesoris"
        subtitle="Untuk pesanan series turunan. Baju diambil dari rak series induk, lalu dipasang aksesoris. Tidak lewat Jadwal Produksi."
        actions={
          <Button variant="primary" icon="plus" onClick={openDrawer}>
            Catat pasang aksesoris
          </Button>
        }
      />

      <div className="card pad">
        <h2 className="h2" style={{ marginBottom: 12 }}>
          Alurnya
        </h2>
        <div className={styles.flow}>
          <div className={styles.fbox}>
            <span className="lbl">1 · Ambil dari rak</span>
            <b>Baju series induk</b>
            <span className="sub">Misalnya Jiharkah Superblack size M</span>
          </div>
          <span className={`i ${styles.arrow}`} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          <div className={styles.fbox}>
            <span className="lbl">2 · Pasang aksesoris</span>
            <b>Stok aksesoris berkurang</b>
            <span className="sub">Misalnya kancing diamond 6 pcs</span>
          </div>
          <span className={`i ${styles.arrow}`} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          <div className={styles.fbox}>
            <span className="lbl">3 · Jadi series turunan</span>
            <b>Siap dikemas</b>
            <span className="sub">Misalnya Imron Superblack size M</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 12 }}>
          <h2 className="h2">Riwayat</h2>
          <p className="sub">{history.length} catatan</p>
        </div>
        {history.length === 0 ? (
          <p className="pad sub">Belum ada catatan pasang aksesoris.</p>
        ) : (
          <div className="tbox">
            <table className="tb">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Series</th>
                  <th scope="col">Warna</th>
                  <th scope="col">Size</th>
                  <th scope="col" className="r">
                    Jumlah
                  </th>
                  <th scope="col">Aksesoris terpakai</th>
                  <th scope="col">No. pesanan</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="num">{formatDateId(h.assembledAt)}</td>
                    <td>
                      <b>{h.childName}</b>
                      <div className="sub">dari {h.parentName}</div>
                    </td>
                    <td>{h.colorName}</td>
                    <td>{h.size}</td>
                    <td className="r num">{h.qty} pcs</td>
                    <td className="sub">
                      {h.materials
                        .map((m) => `${m.label} · ${formatQty(m.qty)} ${m.unit}`)
                        .join(", ")}
                    </td>
                    <td>{h.orderNo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open ? (
        <Drawer
          open
          onClose={() => setOpen(false)}
          title="Catat pasang aksesoris"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Batal
              </Button>
              <Button variant="primary" onClick={submit} disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </>
          }
        >
          {error ? <Note tone="danger">{error}</Note> : null}
          <div className="g2" style={{ gap: 12 }}>
            <Field label="Series turunan" htmlFor="acc-series">
              <Select
                id="acc-series"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
              >
                {data.turunan.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Warna" htmlFor="acc-color">
              <Select id="acc-color" value={colorId} onChange={(e) => setColorId(e.target.value)}>
                {data.colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.colorCode}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Size" htmlFor="acc-size">
              <Select id="acc-size" value={size} onChange={(e) => setSize(e.target.value)}>
                {data.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Jumlah baju" htmlFor="acc-qty">
              <Input
                id="acc-qty"
                numeric
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Field>
          </div>
          <Field label="No. pesanan" htmlFor="acc-order">
            <Input
              id="acc-order"
              value={orderNo}
              placeholder="[No. pesanan]"
              onChange={(e) => setOrderNo(e.target.value)}
            />
          </Field>

          <span className="flabel">Yang akan berkurang</span>
          <div className={styles.kb}>
            <div className={styles.kbRow}>
              <span>
                Ambil dari rak: <b>{parentName || "—"} · {child?.name}</b>
                <div className="sub">Ada di rak: {formatQty(rackQty)} pcs</div>
              </span>
              <b className="num">{qtyNum} pcs</b>
            </div>
            <div className={styles.kbRow}>
              <span>
                {child?.accessoryLabel ?? "—"} · {child?.accessoryQty ?? 0} per baju
                <div className="sub">
                  Sisa stok: {formatQty(accessStock)} {accessory?.unit}
                </div>
              </span>
              <b className="num">{butuh} pcs</b>
            </div>
          </div>

          {kurangRak ? (
            <span className="b b-wr" style={{ alignSelf: "flex-start" }}>
              <Icon name="alert-triangle" /> Stok di rak kurang
            </span>
          ) : null}
          {kurangAks ? (
            <span className="b b-no" style={{ alignSelf: "flex-start" }}>
              <Icon name="octagon-x" /> Stok aksesoris tidak cukup
            </span>
          ) : null}
          {!kurangRak && !kurangAks ? (
            <span className="b b-ok" style={{ alignSelf: "flex-start" }}>
              <Icon name="check" /> Stok cukup
            </span>
          ) : null}
          {(kurangRak || kurangAks) && qtyNum > 0 ? (
            <p className="sub">
              Tetap bisa disimpan. Stok tercatat minus sampai ada barang masuk.
            </p>
          ) : null}
        </Drawer>
      ) : null}
    </>
  );
}