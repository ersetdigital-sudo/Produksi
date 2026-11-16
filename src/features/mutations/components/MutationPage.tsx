"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, StatCard } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatDateId, formatQty } from "@/lib/format";
import type { MutationData, MovementView } from "../queries";
import { InDrawer } from "./InDrawer";
import { OpnameDrawer } from "./OpnameDrawer";
import { OutDrawer } from "./OutDrawer";
import styles from "./mutations.module.css";

type Filter = "all" | "in" | "out" | "opname";
type Period = "7" | "30" | "month";
type DrawerKind = "keluar" | "masuk" | "opname" | null;

const inKinds = new Set(["in", "purchase_in", "production_return"]);
const outKinds = new Set(["out", "production_out", "assembly_out"]);

function movementKind(movement: MovementView): "in" | "out" | "opname" {
  if (movement.kind === "opname") return "opname";
  return movement.qty >= 0 ? "in" : "out";
}

function sourceTitle(movement: MovementView): string {
  const material = [movement.typeName, movement.materialCode]
    .filter(Boolean)
    .join(" ");
  return movement.materialCode
    ? `${movement.typeName} ${movement.materialCode}`
    : movement.materialName ?? material;
}

function sourceSub(movement: MovementView): string | null {
  if (movement.note) return movement.note;
  if (movement.referenceType === "expense") return "Dari Pengeluaran · Pembelian bahan";
  if (movement.referenceType === "production_plan") return "Jadwal produksi";
  if (movement.referenceType === "assembly") return "Pasang Aksesoris";
  return null;
}

export function MutationPage({
  data,
  initialDrawer = null,
  initialMaterialId = null,
}: {
  data: MutationData;
  initialDrawer?: DrawerKind;
  initialMaterialId?: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [period, setPeriod] = useState<Period>("7");
  const [drawer, setDrawer] = useState<DrawerKind>(initialDrawer);

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff =
      period === "7"
        ? new Date(now.getTime() - 7 * 86400000)
        : period === "30"
          ? new Date(now.getTime() - 30 * 86400000)
          : null;

    return data.movements.filter((movement) => {
      const occurred = new Date(movement.occurredAt);
      if (cutoff && occurred < cutoff) return false;
      if (
        !cutoff &&
        (occurred.getMonth() !== now.getMonth() ||
          occurred.getFullYear() !== now.getFullYear())
      ) {
        return false;
      }
      if (filter === "in" && !inKinds.has(movement.kind)) return false;
      if (filter === "out" && !outKinds.has(movement.kind)) return false;
      if (filter === "opname" && movement.kind !== "opname") return false;
      return true;
    });
  }, [data.movements, filter, period]);

  const grouped = useMemo(() => {
    const map = new Map<string, MovementView[]>();
    for (const movement of filtered) {
      const key = new Date(movement.occurredAt).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(movement);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Mutasi Stok"
        subtitle="Riwayat barang keluar, barang masuk, dan opname"
        actions={
          <>
            <Button
              variant="secondary"
              icon="arrow-down"
              onClick={() => setDrawer("masuk")}
              className={styles.secondaryAction}
            >
              Catat masuk
            </Button>
            <Button
              variant="secondary"
              icon="doc"
              onClick={() => setDrawer("opname")}
              className={styles.secondaryAction}
            >
              Opname
            </Button>
            <Button
              variant="primary"
              icon="arrow-up"
              onClick={() => setDrawer("keluar")}
              className={styles.primaryAction}
            >
              Catat barang keluar
            </Button>
          </>
        }
      />

      <div className="g3" style={{ gap: 16 }}>
        <StatCard
          label="Keluar 7 hari terakhir"
          value={data.summary.outLast7}
          sub="catatan"
        />
        <StatCard
          label="Masuk 7 hari terakhir"
          value={data.summary.inLast7}
          sub="catatan"
        />
        <StatCard
          label="Opname terakhir"
          value={
            data.summary.lastOpnameAt
              ? formatDateId(data.summary.lastOpnameAt)
              : "Belum ada"
          }
          compact
          sub={
            data.summary.lastOpnameAt
              ? `${data.summary.lastOpnameCount} kode disesuaikan`
              : "belum pernah opname"
          }
        />
      </div>

      <section className="card" aria-labelledby="mutation-history">
        <div className="row sp wrap pad" style={{ paddingBottom: 14 }}>
          <h2 className="h2" id="mutation-history">
            Riwayat mutasi
          </h2>
          <div className={styles.filterRow}>
            <SegmentedControl
              items={[
                { value: "all", label: "Semua" },
                { value: "in", label: "Masuk" },
                { value: "out", label: "Keluar" },
                { value: "opname", label: "Opname" },
              ]}
              value={filter}
              onChange={(value) => setFilter(value as Filter)}
              ariaLabel="Saring jenis mutasi"
            />
            <select
              className="in"
              aria-label="Periode"
              style={{ width: 170 }}
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
            >
              <option value="7">7 hari terakhir</option>
              <option value="30">30 hari terakhir</option>
              <option value="month">Bulan ini</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada mutasi pada periode ini"
            description="Catat barang masuk, barang keluar, atau opname untuk mulai mengisi riwayat."
          />
        ) : (
          <>
            <div className={`tbox ${styles.historyTable}`}>
              <table className="tb">
                <thead>
                  <tr>
                    <th scope="col">Waktu</th>
                    <th scope="col">Jenis</th>
                    <th scope="col">Material / sumber</th>
                    <th scope="col">Untuk warna</th>
                    <th scope="col" className="r">
                      Jumlah
                    </th>
                    <th scope="col">Dicatat oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((movement) => {
                    const kind = movementKind(movement);
                    return (
                      <tr key={movement.id}>
                        <td className="num" style={{ whiteSpace: "nowrap" }}>
                          {new Date(movement.occurredAt).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short" },
                          )}{" "}
                          ·{" "}
                          {new Date(movement.occurredAt).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </td>
                        <td>
                          <span className="b b-nt">
                            <Icon
                              name={
                                kind === "in"
                                  ? "arrow-down"
                                  : kind === "out"
                                    ? "arrow-up"
                                    : "doc"
                              }
                            />
                            {kind === "in"
                              ? "Masuk"
                              : kind === "out"
                                ? "Keluar"
                                : "Opname"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.historySource}>
                            <span>{sourceTitle(movement)}</span>
                            {sourceSub(movement) ? (
                              <small>{sourceSub(movement)}</small>
                            ) : null}
                          </div>
                        </td>
                        <td className={movement.colorName ? undefined : "sub"}>
                          {movement.colorName ?? "—"}
                        </td>
                        <td className="r num">
                          <b
                            className={
                              kind === "in"
                                ? styles.qtyIn
                                : kind === "out"
                                  ? styles.qtyOut
                                  : undefined
                            }
                          >
                            {movement.qty > 0 ? "+" : ""}
                            {formatQty(movement.qty)} {movement.unit}
                          </b>
                        </td>
                        <td>
                          {movement.userName ??
                            (movement.referenceType === "seed"
                              ? "Sistem"
                              : "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileHistory}>
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <h3 className="lbl" style={{ padding: "10px 16px" }}>
                    {formatDateId(date)}
                  </h3>
                  <div className="card">
                    {items.map((movement) => {
                      const kind = movementKind(movement);
                      return (
                        <div className="li" key={movement.id}>
                          <span className="ico">
                            <Icon
                              name={
                                kind === "in"
                                  ? "arrow-down"
                                  : kind === "out"
                                    ? "arrow-up"
                                    : "doc"
                              }
                            />
                          </span>
                          <div className="grow">
                            <div style={{ fontWeight: 600 }}>
                              {sourceTitle(movement)}
                            </div>
                            <div className="sub">
                              {kind === "in"
                                ? "Masuk"
                                : kind === "out"
                                  ? "Keluar"
                                  : "Opname"}
                              {movement.colorName
                                ? ` · ${movement.colorName}`
                                : ""}
                              {movement.userName
                                ? ` · ${movement.userName}`
                                : ""}{" "}
                              ·{" "}
                              {new Date(movement.occurredAt).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </div>
                          </div>
                          <b
                            className={`num ${
                              kind === "in"
                                ? styles.qtyIn
                                : kind === "out"
                                  ? styles.qtyOut
                                  : ""
                            }`}
                          >
                            {movement.qty > 0 ? "+" : ""}
                            {formatQty(movement.qty)} {movement.unit}
                          </b>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {drawer === "keluar" ? (
        <OutDrawer
          data={data}
          onClose={() => setDrawer(null)}
          onSaved={() => setDrawer(null)}
        />
      ) : null}
      {drawer === "masuk" ? (
        <InDrawer
          data={data}
          initialMaterialId={initialMaterialId ?? undefined}
          onClose={() => setDrawer(null)}
          onSaved={() => setDrawer(null)}
        />
      ) : null}
      {drawer === "opname" ? (
        <OpnameDrawer
          data={data}
          onClose={() => setDrawer(null)}
          onSaved={() => setDrawer(null)}
        />
      ) : null}
    </>
  );
}
