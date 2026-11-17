"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink, SearchInput } from "@/components/ui/controls";
import { MobileSectionNav } from "@/components/shell/MobileSectionNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/icons";
import {
  EmptyState,
  Legend,
  LegendItem,
} from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tabs } from "@/components/ui/Tabs";
import { ColorThumb } from "./ColorThumb";
import { StatusBadge } from "@/components/ui/badges";
import {
  colorSummaryLabel,
  type ColorSummary,
} from "@/features/stock/status";
import type { ColorCatalogData } from "../queries";
import { ColorDetailDrawer } from "./ColorDetailDrawer";
import { ColorFormDrawer } from "./ColorFormDrawer";
import { PairingCell } from "./PairingCell";
import styles from "./colors.module.css";

type FormState =
  | { mode: "tambah" }
  | { mode: "ubah"; colorId: string }
  | null;

const summaryToStatus = {
  aman: "aman",
  menipis: "menipis",
  cadangan: "cadangan",
  habis: "habis",
  belum: "kosong",
} as const;

function ColorSummaryBadge({ summary }: { summary: ColorSummary }) {
  return (
    <StatusBadge
      status={summaryToStatus[summary]}
      label={colorSummaryLabel(summary)}
    />
  );
}

export function ColorCatalog({ data }: { data: ColorCatalogData }) {
  const [fabric, setFabric] = useState("Semua");
  const [productFilter, setProductFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"kartu" | "tabel">("kartu");
  const [legend, setLegend] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        data.colors
          .filter(
            (color) =>
              color.summary === "habis" ||
              color.summary === "menipis" ||
              color.summary === "cadangan",
          )
          .map((color) => color.id),
      ),
  );

  const fabricTabs = useMemo(
    () => [
      { value: "Semua", label: "Semua", count: data.colors.length },
      ...data.fabrics.map((item) => ({
        value: item.id,
        label: item.code,
        count: data.colors.filter((color) => color.fabricId === item.id).length,
      })),
    ],
    [data.colors, data.fabrics],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.colors.filter((color) => {
      if (fabric !== "Semua" && color.fabricId !== fabric) return false;
      if (!needle) return true;
      const haystack = [
        color.name,
        color.colorCode,
        color.fabricCode,
        color.products.map((product) => product.name).join(" "),
        color.pairings
          .map((pairing) =>
            [
              pairing.slotName,
              pairing.primary?.code,
              pairing.primary?.name,
              pairing.backup?.code,
              pairing.backup?.name,
            ]
              .filter(Boolean)
              .join(" "),
          )
          .join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [data.colors, fabric, query]);

  const mobileFiltered = useMemo(
    () =>
      filtered.filter(
        (color) =>
          productFilter === "Semua" ||
          color.products.some((product) => product.id === productFilter),
      ),
    [filtered, productFilter],
  );

  const detail = data.colors.find((color) => color.id === detailId) ?? null;
  const formColor =
    form?.mode === "ubah"
      ? data.colors.find((color) => color.id === form.colorId) ?? null
      : null;

  const selectedFabric =
    fabric === "Semua"
      ? null
      : data.fabrics.find((item) => item.id === fabric) ?? null;

  const emptyTitle = query.trim()
    ? "Tidak ada warna yang cocok"
    : selectedFabric
      ? `Belum ada warna untuk Jenis Kain ${selectedFabric.code}`
      : "Belum ada warna";

  const template =
    fabric === "Semua"
      ? `128px minmax(116px, 1fr) 136px repeat(${Math.max(1, data.slots.length)}, minmax(104px, 1fr)) 32px`
      : `92px minmax(120px, 1fr) 136px repeat(${Math.max(1, data.slots.length)}, minmax(104px, 1fr)) 32px`;
  const cardTemplate = `188px repeat(${Math.max(1, data.slots.length)}, minmax(0, 1fr))`;

  const toggleExpanded = (colorId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(colorId)) next.delete(colorId);
      else next.add(colorId);
      return next;
    });
  };

  const tableTabs = (
    <Tabs
      items={fabricTabs}
      value={fabric}
      onChange={setFabric}
      ariaLabel="Jenis kain"
    />
  );

  const empty = (
    <div className={styles.sheet}>
      <EmptyState
        title={emptyTitle}
        description="Tambahkan lewat tombol Tambah warna di kanan atas."
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Katalog Warna"
        mobileTitle="Stok"
        mobileSubtitle={null}
        subtitle="Daftar kain SAMAQU dan kode pasangannya. Klik baris untuk lihat detail."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setForm({ mode: "tambah" })}
          >
            Tambah warna
          </Button>
        }
      />

      <MobileSectionNav
        items={[
          { value: "warna", label: "Warna", href: "/warna" },
          { value: "material", label: "Material", href: "/material" },
        ]}
        current="warna"
        ariaLabel="Jenis stok"
      />

      <div className={styles.toolbar}>
        <SearchInput
          wrapClassName={styles.search}
          placeholder="Cari warna, Col#, atau kode"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={styles.viewToggle}>
          <SegmentedControl
            items={[
              {
                value: "kartu",
                label: (
                  <span className={styles.segLabel}>
                    <Icon name="grid" size={16} />
                    Kartu
                  </span>
                ),
              },
              {
                value: "tabel",
                label: (
                  <span className={styles.segLabel}>
                    <Icon name="box" size={16} />
                    Tabel
                  </span>
                ),
              },
            ]}
            value={view}
            onChange={(value) => setView(value as "kartu" | "tabel")}
            ariaLabel="Tampilan"
          />
        </div>
        <div className={styles.actionsRow}>
          <Button
            variant="ghost"
            size="sm"
            icon="info"
            aria-expanded={legend}
            onClick={() => setLegend((value) => !value)}
          >
            Arti warna
          </Button>
        </div>
      </div>

      {legend ? (
        <Legend>
          <LegendItem>
            <span className="code">722</span>
            <span>aman</span>
          </LegendItem>
          <LegendItem>
            <StatusBadge status="menipis" label="502 menipis" />
            <span>segera beli</span>
          </LegendItem>
          <LegendItem>
            <StatusBadge status="cadangan" label="172→069" />
            <span>habis, pakai cadangan</span>
          </LegendItem>
          <LegendItem>
            <StatusBadge status="habis" label="503 habis" />
            <span>tanpa cadangan</span>
          </LegendItem>
          <LegendItem>
            <span className="ph">—</span>
            <span>belum diisi</span>
          </LegendItem>
        </Legend>
      ) : null}

      <div className={styles.mobileFilters}>
        <div className="f">
          <label htmlFor="color-fabric-filter">Jenis Kain</label>
          <select
            id="color-fabric-filter"
            className="in"
            value={fabric}
            onChange={(event) => setFabric(event.target.value)}
          >
            <option value="Semua">Semua</option>
            {data.fabrics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="color-product-filter">Jenis Produk</label>
          <select
            id="color-product-filter"
            className="in"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
          >
            <option value="Semua">Semua</option>
            {data.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === "tabel" ? (
        <div className={styles.desktopOnly}>
          {filtered.length === 0 ? (
            empty
          ) : (
            <div className={styles.sheet}>
              {tableTabs}
              <div
                className={styles.gridHead}
                style={{ gridTemplateColumns: template }}
                role="row"
              >
                <span>
                  {fabric === "Semua" ? "Jenis · Kode Warna" : "Kode Warna"}
                </span>
                <span>Warna Kain</span>
                <span>Jenis Produk</span>
                {data.slots.map((slot) => (
                  <span key={slot.id}>{slot.name}</span>
                ))}
                <span aria-hidden="true" />
              </div>
              {filtered.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={styles.gridRow}
                  style={{ gridTemplateColumns: template }}
                  onClick={() => setDetailId(color.id)}
                  aria-label={`Lihat detail ${color.name} ${color.fabricCode} ${color.colorCode}`}
                >
                  <span className="code">
                    {fabric === "Semua"
                      ? `${color.fabricCode} · ${color.colorCode}`
                      : color.colorCode}
                  </span>
                  <span>
                    <ColorThumb
                      hex={color.hex}
                      photoUrl={color.photoUrl}
                      name={color.name}
                      size={14}
                    />
                    {color.name}
                  </span>
                  <span style={{ color: "var(--ink2)" }}>
                    {color.products.length > 0
                      ? color.products.map((product) => product.name).join(", ")
                      : "—"}
                  </span>
                  {color.pairings.map((pairing) => (
                    <span key={pairing.slotId}>
                      <PairingCell pairing={pairing} variant="table" />
                    </span>
                  ))}
                  <span>
                    <Icon name="chevron-right" size={16} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.desktopOnly}>
          {filtered.length === 0 ? (
            empty
          ) : (
            <div className={styles.cardList}>
              <Tabs
                items={fabricTabs}
                value={fabric}
                onChange={setFabric}
                ariaLabel="Jenis kain"
                variant="plain"
              />
              {data.fabrics.map((fabricItem) => {
                const group = filtered.filter(
                  (color) => color.fabricId === fabricItem.id,
                );
                if (group.length === 0) return null;
                return (
                  <section className={styles.cardGroup} key={fabricItem.id}>
                    <div className={styles.groupHead}>
                      <b>Jenis Kain: {fabricItem.code}</b>
                      <span>{group.length} warna</span>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {group.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          className={styles.colorCard}
                          style={{ gridTemplateColumns: cardTemplate }}
                          onClick={() => setDetailId(color.id)}
                          aria-label={`Lihat detail ${color.name} ${color.fabricCode} ${color.colorCode}`}
                        >
                          <div className={styles.colorInfo}>
                            <ColorThumb
                              hex={color.hex}
                              photoUrl={color.photoUrl}
                              name={color.name}
                              size={72}
                              radius={10}
                            />
                            <div className={styles.colorInfoText}>
                              <b>{color.name}</b>
                              <small>{color.colorCode}</small>
                              <small className={styles.plain}>
                                {color.products.length > 0
                                  ? color.products
                                      .map((product) => product.name)
                                      .join(", ")
                                  : "—"}
                              </small>
                            </div>
                          </div>
                          {color.pairings.map((pairing) => (
                            <PairingCell
                              key={pairing.slotId}
                              pairing={pairing}
                              variant="card"
                            />
                          ))}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={styles.mobileList}>
        <p className="sub">
          {mobileFiltered.length} warna · ketuk kartu untuk buka atau tutup
          pasangannya
        </p>
        {mobileFiltered.length === 0 ? (
          <div className={styles.sheet}>
            <EmptyState
              title={emptyTitle}
              description="Tambahkan lewat tombol Tambah warna di kanan atas."
            />
          </div>
        ) : (
          mobileFiltered.map((color) => {
            const isOpen = expanded.has(color.id);
            return (
              <article className={`card ${styles.mobileCard}`} key={color.id}>
                <button
                  type="button"
                  className={styles.mobileHead}
                  onClick={() => toggleExpanded(color.id)}
                  aria-expanded={isOpen}
                >
                  <ColorThumb
                    hex={color.hex}
                    photoUrl={color.photoUrl}
                    name={color.name}
                    size={56}
                    radius={8}
                  />
                  <span className={styles.mobileHeadText}>
                    <b>{color.name}</b>
                    <span className={`sub ${styles.mobileSub}`}>
                      <span className="code">{color.fabricCode}</span> ·{" "}
                      <span className="code">{color.colorCode}</span>
                    </span>
                    <span className={styles.mobileSummary}>
                      <ColorSummaryBadge summary={color.summary} />
                      <span className="ph">
                        {color.products.length > 0
                          ? color.products
                              .map((product) => product.name)
                              .join(", ")
                          : "[jenis produk]"}
                      </span>
                    </span>
                  </span>
                  <Icon name={isOpen ? "chevron-up" : "chevron-down"} />
                </button>

                {isOpen ? (
                  <>
                    <div className={styles.mobilePairs}>
                      {color.pairings.map((pairing) => (
                        <div className={styles.mobilePair} key={pairing.slotId}>
                          <div className={styles.mobilePairTop}>
                            <span className="sub">{pairing.slotName}</span>
                            <StatusBadge status={pairing.status} />
                          </div>
                          <div className={styles.mobilePairCode}>
                            {pairing.status === "kosong" ? (
                              <span className="ph">Kode belum diisi</span>
                            ) : (
                              <>
                                Utama{" "}
                                <span className="code">
                                  {pairing.primary?.code ??
                                    pairing.primary?.name}
                                </span>
                                {pairing.primary?.name &&
                                pairing.primary.code ? (
                                  <span className="sub">
                                    {" "}
                                    ({pairing.primary.name})
                                  </span>
                                ) : null}
                                {pairing.status === "cadangan" &&
                                pairing.backup ? (
                                  <>
                                    {" "}
                                    · Cadangan{" "}
                                    <span className="code">
                                      {pairing.backup.code ??
                                        pairing.backup.name}
                                    </span>
                                  </>
                                ) : null}
                                {pairing.status === "habis" ? (
                                  <span className="sub"> · tanpa cadangan</span>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <ButtonLink
                      href={`/mutasi?warna=${color.id}`}
                      variant="secondary"
                      full
                    >
                      Catat keluar untuk warna ini
                    </ButtonLink>
                  </>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <ColorDetailDrawer
        color={detail}
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          if (!detail) return;
          setForm({ mode: "ubah", colorId: detail.id });
          setDetailId(null);
        }}
      />

      {form ? (
        <ColorFormDrawer
          key={form.mode === "ubah" ? form.colorId : "tambah"}
          open
          color={formColor}
          data={data}
          onClose={() => setForm(null)}
          onSaved={() => setForm(null)}
        />
      ) : null}
    </>
  );
}
