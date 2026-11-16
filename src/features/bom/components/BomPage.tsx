"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/PageHeader";
import { Note } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/Tabs";
import { formatQty } from "@/lib/format";
import {
  toggleSeriesActive,
  type ActionResult,
} from "../actions";
import type {
  BomCellView,
  BomData,
  BomPattern,
  BomRowView,
  BomSeries,
} from "../queries";
import { CellDrawer } from "./CellDrawer";
import { SeriesDrawer } from "./SeriesDrawer";
import styles from "./bom.module.css";

const POLA: Record<BomPattern, { label: string; className: string }> = {
  warna: { label: "Ikut warna", className: "b b-jd" },
  size: { label: "Ikut size", className: "b b-jd" },
  series: { label: "Beda per series", className: "b b-wr" },
  sama: { label: "Sama semua", className: "b b-nt" },
};

function cellText(row: BomRowView, cell: BomCellView): string {
  if (cell.unused) return "Tidak dipakai";

  if (row.pattern === "warna") {
    if (cell.qty === null) return "Ikut warna · Belum diisi";
    return `Ikut warna · ${formatQty(cell.qty)} ${cell.unit ?? ""}`.trim();
  }

  if (row.pattern === "size") {
    const withQty = cell.sizes.filter((size) => size.qty !== null);
    const uniqueQty = Array.from(new Set(withQty.map((size) => size.qty)));
    if (withQty.length === 0 || uniqueQty.length !== 1) {
      return "Ikut size · Belum diisi";
    }
    return `Ikut size · ${formatQty(withQty[0]?.qty ?? 0)} pcs`;
  }

  if (!cell.materialLabel) return "Belum diisi";
  if (cell.qty === null) return `${cell.materialLabel} · Belum diisi`;
  return `${cell.materialLabel} · ${formatQty(cell.qty)} ${
    cell.unit ?? ""
  }`.trim();
}

function signature(cell: BomCellView): string {
  return JSON.stringify({
    materialId: cell.materialId,
    qty: cell.qty,
    unit: cell.unit,
    unused: cell.unused,
    sizes: cell.sizes
      .map((size) => [size.size, size.materialId, size.qty])
      .sort(),
  });
}

function seriesAccessoryText(seriesItem: BomSeries): string {
  if (seriesItem.accessories.length === 0) return "—";
  return seriesItem.accessories
    .map((item) =>
      `${item.label} · ${
        item.qty === null
          ? "Belum diisi"
          : `${formatQty(item.qty)} ${item.unit}`
      }`,
    )
    .join(", ");
}

export function BomPage({ data }: { data: BomData }) {
  const router = useRouter();
  const [productId, setProductId] = useState(data.products[0]?.id ?? "");
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [cellEdit, setCellEdit] = useState<{
    row: BomRowView;
    cell: BomCellView;
    series: BomSeries;
  } | null>(null);
  const [pendingSeriesId, setPendingSeriesId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const product = data.products.find((item) => item.id === productId);
  const seriesList = data.seriesByProduct[productId] ?? [];
  const columns = data.productionSeriesByProduct[productId] ?? [];
  const sections = data.sectionsByProduct[productId] ?? [];
  const accessoryMaterials = useMemo(
    () => data.materials.filter((material) => material.group === "aksesoris"),
    [data.materials],
  );

  const productTabs = data.products.map((item) => ({
    value: item.id,
    label: item.name,
    count: data.seriesByProduct[item.id]?.length ?? 0,
  }));

  const template = `190px 124px repeat(${Math.max(
    1,
    columns.length,
  )}, minmax(160px, 1fr))`;
  const minWidth = 190 + 124 + Math.max(1, columns.length) * 160;

  const toggleActive = (item: BomSeries) => {
    setPageError(null);
    setPendingSeriesId(item.id);
    void toggleSeriesActive(item.id, !item.active).then(
      (result: ActionResult) => {
        setPendingSeriesId(null);
        if (!result.ok) setPageError(result.error);
        else router.refresh();
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Bahan per Pcs"
        subtitle="Bahan yang habis untuk 1 baju, per series. Jadwal Produksi memakai angka ini untuk menghitung kebutuhan bahan."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setSeriesOpen(true)}
          >
            Tambah series
          </Button>
        }
      />

      {pageError ? <Note tone="danger">{pageError}</Note> : null}

      <section className={`card ${styles.tabsCard}`}>
        <Tabs
          items={productTabs}
          value={productId}
          onChange={(value) => {
            setProductId(value);
            setCellEdit(null);
          }}
          ariaLabel="Jenis produk"
        />
        <div className={styles.sectionHead}>
          <h2 className="h2">Series {product?.name ?? ""}</h2>
          <p className="sub">
            Series diproduksi punya kolom sendiri di tabel bahan. Series turunan
            diambil dari rak series induknya, lalu ditambah aksesoris lewat
            Pasang Aksesoris.
          </p>
        </div>

        {seriesList.length === 0 ? (
          <p className={`sub ${styles.seriesEmpty}`}>
            Belum ada series untuk {product?.name ?? "produk ini"}. Klik Tambah
            series.
          </p>
        ) : (
          <>
            <div className={styles.desktopSeries}>
              <div className={`${styles.seriesGrid} ${styles.head}`}>
                <span>Series</span>
                <span>Jenis</span>
                <span>Diambil dari</span>
                <span>Aksesoris tambahan per baju</span>
                <span>Aktif</span>
              </div>
              {seriesList.map((item) => (
                <div className={styles.seriesGrid} key={item.id}>
                  <span>
                    <b className={styles.seriesName}>{item.name}</b>
                  </span>
                  <span>
                    <span
                      className={item.kind === "diproduksi" ? "b b-jd" : "b b-nt"}
                      style={{ height: 22, fontSize: 12 }}
                    >
                      {item.kind === "diproduksi" ? "Diproduksi" : "Turunan"}
                    </span>
                  </span>
                  <span>
                    <span className={styles.mobileLabel}>Diambil dari: </span>
                    {item.parentName ?? "—"}
                  </span>
                  <span className={styles.accessoryText}>
                    <span className={styles.mobileLabel}>Aksesoris: </span>
                    {seriesAccessoryText(item)}
                  </span>
                  <span>
                    <span className={styles.mobileLabel}>Aktif: </span>
                    <input
                      type="checkbox"
                      checked={item.active}
                      disabled={pendingSeriesId === item.id}
                      onChange={() => toggleActive(item)}
                      aria-label={`Series ${item.name} aktif`}
                    />
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.mobileSeries}>
              {seriesList.map((item) => (
                <div className={styles.mobileSeriesRow} key={item.id}>
                  <div className={styles.mobileSeriesMain}>
                    <span className="row" style={{ gap: 8 }}>
                      <b>{item.name}</b>
                      <span
                        className={
                          item.kind === "diproduksi" ? "b b-jd" : "b b-nt"
                        }
                        style={{ height: 22, fontSize: 12 }}
                      >
                        {item.kind === "diproduksi" ? "Diproduksi" : "Turunan"}
                      </span>
                    </span>
                    <div className={styles.mobileSeriesMeta}>
                      Diambil dari: {item.parentName ?? "—"}
                      <br />
                      Aksesoris: {seriesAccessoryText(item)}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.active}
                    disabled={pendingSeriesId === item.id}
                    onChange={() => toggleActive(item)}
                    aria-label={`Series ${item.name} aktif`}
                    style={{
                      width: 20,
                      height: 20,
                      margin: 0,
                      accentColor: "#1f5550",
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={`card ${styles.matrixCard}`}>
        <div className={styles.sectionHead}>
          <h2 className="h2">Isi bahan {product?.name ?? ""} per series</h2>
          <p className="sub">
            Klik sel untuk mengubah. Sel hijau berarti berbeda dari series
            pertama.
          </p>
        </div>

        {columns.length === 0 || sections.length === 0 ? (
          <p className={`sub ${styles.seriesEmpty}`}>
            {seriesList.length === 0
              ? `Belum ada series untuk ${product?.name ?? "produk ini"}. Tambah series dulu.`
              : `Belum ada bahan untuk ${product?.name ?? "produk ini"}. Tambah series dulu, lalu isi bahannya.`}
          </p>
        ) : (
          <div className={styles.matrixHeadWrap}>
            <div className={styles.matrixInner} style={{ minWidth }}>
              <div
                className={styles.matrixHead}
                style={{ gridTemplateColumns: template }}
              >
                <span>Bagian / item</span>
                <span>Pola</span>
                {columns.map((column) => (
                  <span key={column.id}>{column.name}</span>
                ))}
              </div>

              {sections.map((section) => (
                <Fragment key={section.id}>
                  <div className={styles.matrixGroup}>{section.name}</div>
                  {section.rows.map((row) => {
                    const firstCell = row.cells[columns[0]?.id ?? ""];
                    const firstSignature = firstCell
                      ? signature(firstCell)
                      : "";
                    return (
                      <div
                        className={styles.matrixRow}
                        style={{ gridTemplateColumns: template }}
                        key={row.id}
                      >
                        <span>
                          <b style={{ fontWeight: 600 }}>{row.name}</b>
                        </span>
                        <span>
                          <span
                            className={`${POLA[row.pattern].className} ${styles.pola}`}
                          >
                            {POLA[row.pattern].label}
                          </span>
                        </span>
                        {columns.map((column, index) => {
                          const cell = row.cells[column.id];
                          if (!cell) {
                            return <span key={column.id}>—</span>;
                          }
                          const text = cellText(row, cell);
                          const different =
                            index > 0 &&
                            firstSignature !== "" &&
                            signature(cell) !== firstSignature;
                          return (
                            <button
                              key={column.id}
                              type="button"
                              className={[
                                styles.cell,
                                text === "Tidak dipakai" ? styles.no : "",
                                text.includes("Belum diisi") ? styles.isi : "",
                                different ? styles.beda : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() =>
                                setCellEdit({ row, cell, series: column })
                              }
                            >
                              {text}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        <p className={`sub ${styles.matrixHint}`}>
          Kemasan kirim (box, wrapping paper, kartu ucapan, bubble wrap) sengaja
          tidak ada di sini, karena baru terpakai saat pesanan dikemas.
        </p>
      </section>

      {seriesOpen ? (
        <SeriesDrawer
          productId={productId}
          productName={product?.name ?? ""}
          productionSeries={columns}
          accessoryMaterials={accessoryMaterials}
          onClose={() => setSeriesOpen(false)}
          onSaved={() => setSeriesOpen(false)}
        />
      ) : null}

      {cellEdit ? (
        <CellDrawer
          key={cellEdit.cell.id}
          cell={cellEdit.cell}
          row={cellEdit.row}
          series={cellEdit.series}
          sizes={data.sizes}
          materials={data.materials}
          onClose={() => setCellEdit(null)}
          onSaved={() => setCellEdit(null)}
        />
      ) : null}
    </>
  );
}
