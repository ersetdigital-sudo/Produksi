"use client";

import { useMemo, useState } from "react";
import { Button, SearchInput } from "@/components/ui/controls";
import { MobileSectionNav } from "@/components/shell/MobileSectionNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/icons";
import {
  EmptyState,
  Legend,
  LegendItem,
  Swatch,
} from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/badges";
import { formatQty } from "@/lib/format";
import type {
  MaterialCatalogData,
  MaterialGroupKey,
  MaterialTypeView,
  MaterialView,
} from "../queries";
import { MaterialDetailDrawer } from "./MaterialDetailDrawer";
import { MaterialFormDrawer } from "./MaterialFormDrawer";
import styles from "./materials.module.css";

type GroupValue = "all" | MaterialGroupKey;

function matches(material: MaterialView, needle: string): boolean {
  if (!needle) return true;
  return [
    material.code,
    material.name,
    material.typeName,
    material.usage,
    material.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function filterTypes(types: MaterialTypeView[], needle: string): MaterialTypeView[] {
  return types
    .map((type) => ({
      ...type,
      materials: type.materials.filter((material) =>
        matches(material, needle),
      ),
    }))
    .filter((type) => !needle || type.materials.length > 0);
}

export function MaterialCatalog({ data }: { data: MaterialCatalogData }) {
  const [group, setGroup] = useState<GroupValue>("all");
  const [query, setQuery] = useState("");
  const [legend, setLegend] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const allTypes = useMemo(
    () => data.groups.flatMap((item) => item.types),
    [data.groups],
  );

  const groupTabs = useMemo(
    () => [
      { value: "all", label: "Semua", count: data.total },
      ...data.groups.map((item) => ({
        value: item.key,
        label: item.label,
        count: item.count,
      })),
    ],
    [data],
  );

  const needle = query.trim().toLowerCase();

  const visibleTypes = useMemo(() => {
    const source =
      group === "all"
        ? allTypes
        : data.groups.find((item) => item.key === group)?.types ?? [];
    return filterTypes(source, needle);
  }, [allTypes, data.groups, group, needle]);

  const mobileTypes = visibleTypes;

  const allMaterials = useMemo(
    () => allTypes.flatMap((type) => type.materials),
    [allTypes],
  );
  const detail =
    allMaterials.find((material) => material.id === detailId) ?? null;

  const groupIsAll = group === "all";
  const template = groupIsAll
    ? "136px 80px minmax(0, 1fr) 96px 64px minmax(0, 1.1fr) 156px minmax(0, 1.4fr) 36px"
    : "92px minmax(0, 1fr) 96px 72px minmax(0, 1.2fr) 156px minmax(0, 1.5fr) 36px";

  const empty = (
    <div className={styles.sheet}>
      <EmptyState
        title="Tidak ada material yang cocok"
        description="Coba cari dengan kode, nama, atau warna lain."
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Stok Material"
        mobileTitle="Stok"
        mobileSubtitle={null}
        subtitle="Klik salah satu baris untuk lihat detail."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setFormOpen(true)}
          >
            Tambah material
          </Button>
        }
      />

      <MobileSectionNav
        items={[
          { value: "warna", label: "Warna", href: "/warna" },
          { value: "material", label: "Material", href: "/material" },
        ]}
        current="material"
        ariaLabel="Jenis stok"
      />

      <p className={`sub ${styles.mobileParagraph}`}>
        Sisa stok semua benang, resleting, dan kancing. Ketuk salah satu untuk
        lihat detail dan catat stoknya.
      </p>

      <div className={styles.toolbar}>
        <SearchInput
          wrapClassName={styles.search}
          placeholder="Cari kode atau warna"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={styles.toolbarActions}>
          <Button
            variant="ghost"
            size="sm"
            icon="info"
            aria-expanded={legend}
            onClick={() => setLegend((value) => !value)}
          >
            Arti status
          </Button>
        </div>
      </div>

      {legend ? (
        <Legend>
          <LegendItem>
            <b style={{ fontSize: 13 }}>Aman</b>
            <span>stok cukup</span>
          </LegendItem>
          <LegendItem>
            <b style={{ fontSize: 13 }}>Menipis</b>
            <span>di bawah minimum, segera beli</span>
          </LegendItem>
          <LegendItem>
            <b style={{ fontSize: 13 }}>Pakai cadangan</b>
            <span>habis, sementara diganti kode lain</span>
          </LegendItem>
          <LegendItem>
            <b style={{ fontSize: 13 }}>Habis</b>
            <span>tidak ada pengganti</span>
          </LegendItem>
        </Legend>
      ) : null}

      <div className={styles.mobileChips} role="group" aria-label="Jenis material">
        <button
          type="button"
          className={`chip ${group === "all" ? "on" : ""}`}
          onClick={() => setGroup("all")}
        >
          Semua
        </button>
        {data.groups.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`chip ${group === item.key ? "on" : ""}`}
            onClick={() => setGroup(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleTypes.length === 0 && needle ? (
        empty
      ) : (
        <div className={styles.sheet}>
          <Tabs
            items={groupTabs}
            value={group}
            onChange={(value) => setGroup(value as GroupValue)}
            ariaLabel="Jenis material"
          />
          <div
            className={styles.gridHead}
            style={{ gridTemplateColumns: template }}
          >
            {groupIsAll ? <span>Jenis</span> : null}
            <span>Kode</span>
            <span>Nama / Brand</span>
            <span className={styles.right}>Sisa</span>
            <span className={styles.right}>Min.</span>
            <span>Dipakai untuk</span>
            <span>Status</span>
            <span>Keterangan</span>
            <span aria-hidden="true" />
          </div>

          {visibleTypes.flatMap((type) => type.materials).length === 0 ? (
            <div className={styles.emptyType}>
              <b>Belum ada material</b>
              <span className="sub">
                Tambahkan lewat tombol Tambah material di kanan atas.
              </span>
            </div>
          ) : (
            visibleTypes.flatMap((type) =>
              type.materials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  className={styles.gridRow}
                  style={{ gridTemplateColumns: template }}
                  onClick={() => setDetailId(material.id)}
                  aria-label={`Lihat detail ${material.typeName} ${
                    material.code ?? material.name ?? ""
                  }`}
                >
                  {groupIsAll ? (
                    <span style={{ color: "var(--ink2)" }}>
                      {material.typeName}
                    </span>
                  ) : null}
                  <span>
                    {material.code ? (
                      <b className="code">{material.code}</b>
                    ) : (
                      <span style={{ color: "var(--ink3)" }}>—</span>
                    )}
                  </span>
                  <span>
                    {material.name ?? (
                      <span style={{ color: "var(--ink3)" }}>—</span>
                    )}
                  </span>
                  <span className={styles.right}>
                    <b className="num">{formatQty(material.stock)}</b>
                    <span className="sub" style={{ fontSize: 12 }}>
                      {material.unit}
                    </span>
                  </span>
                  <span
                    className={`${styles.right} num`}
                    style={{ color: "var(--ink3)" }}
                  >
                    {formatQty(material.min)}
                  </span>
                  <span>
                    {material.usageColor ? (
                      <Swatch
                        color={material.usageColor.hex}
                        size={14}
                        label={`Foto kain ${material.usageColor.name}`}
                      />
                    ) : null}
                    {material.usage}
                  </span>
                  <span>
                    <StatusBadge status={material.status} />
                  </span>
                  <span style={{ color: "var(--ink2)" }}>
                    {material.note}
                  </span>
                  <span>
                    <Icon name="chevron-right" size={16} />
                  </span>
                </button>
              )),
            )
          )}
        </div>
      )}

      <div className={styles.mobileList}>
        {mobileTypes.length === 0 ? (
          <div className={styles.sheet}>
            <EmptyState
              title="Tidak ada material yang cocok"
              description="Coba cari dengan kode, nama, atau warna lain."
            />
          </div>
        ) : (
          mobileTypes.map((type) => (
            <section className={styles.mobileSection} key={type.id}>
              <div className="row sp">
                <h2 className="h3">{type.name}</h2>
                <span className="sub">
                  {type.materials.length} kode · satuan {type.unit}
                </span>
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {type.materials.length === 0 ? (
                  <p className="sub" style={{ padding: "14px 16px" }}>
                    <span className="ph">[belum ada data]</span>
                  </p>
                ) : (
                  type.materials.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      className={styles.mobileRow}
                      onClick={() => setDetailId(material.id)}
                      aria-label={`Lihat detail ${type.name} ${
                        material.code ?? material.name ?? ""
                      }`}
                    >
                      {material.usageColor ? (
                        <Swatch
                          color={material.usageColor.hex}
                          size={36}
                          radius={6}
                          label={`Foto kain ${material.usageColor.name}`}
                        />
                      ) : null}
                      <span className={styles.mobileText}>
                        <span>
                          <b className="code" style={{ fontSize: 15 }}>
                            {material.code ?? "—"}
                          </b>{" "}
                          <span className="sub">untuk {material.usage}</span>
                          {material.primaryForBackup ? (
                            <span className="sub">
                              {" "}
                              (pengganti {material.primaryForBackup.code})
                            </span>
                          ) : null}
                        </span>
                        <span className="sub">
                          Sisa{" "}
                          <b
                            className="num"
                            style={{ color: "var(--ink)" }}
                          >
                            {formatQty(material.stock)} {material.unit}
                          </b>{" "}
                          · minimum {formatQty(material.min)}
                        </span>
                        {material.note !== "—" ? (
                          <span className="sub" style={{ fontSize: 12 }}>
                            {material.note}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.mobileBadge}>
                        <StatusBadge status={material.status} />
                      </span>
                      <Icon name="chevron-right" />
                    </button>
                  ))
                )}
              </div>
            </section>
          ))
        )}
      </div>

      <MaterialDetailDrawer
        material={detail}
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
      />

      {formOpen ? (
        <MaterialFormDrawer
          open
          types={data.types}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      ) : null}
    </>
  );
}
