"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badges";
import { Button } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/format";
import type { ExpenseView } from "../queries";
import { ExpenseFormDrawer } from "./ExpenseFormDrawer";
import styles from "./expenses.module.css";

const CAT_COLORS = [
  "var(--ac)",
  "var(--ok)",
  "var(--wr)",
  "var(--no)",
  "var(--ac2)",
  "var(--ink2)",
];

function catColor(index: number): string {
  return CAT_COLORS[index % CAT_COLORS.length]!;
}

export function ExpensePage({
  data,
  lookup,
  months,
  currentMonth,
  filter,
  onMonthChange,
  onFilterChange,
}: {
  data: { summary: import("../queries").ExpenseSummary; expenses: ExpenseView[] };
  lookup: import("../queries").ExpenseLookup;
  months: string[];
  currentMonth: string;
  filter: string;
  onMonthChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onOpenForm?: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);

  const monthLabel = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    const name = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
      new Date(year, (month ?? 1) - 1, 1),
    );
    return `${name} ${year}`;
  };

  const monthName = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
      new Date(year, (month ?? 1) - 1, 1),
    );
  };

  const filtered = useMemo(
    () =>
      filter === "all"
        ? data.expenses
        : data.expenses.filter(
            (item) => item.categoryId === filter || item.categoryName === filter,
          ),
    [data.expenses, filter],
  );

  const categoriesWithIndex = data.summary.byCategory.map((c, idx) => ({
    ...c,
    colorIndex: idx,
  }));
  const visibleCategories = categoriesWithIndex.filter((c) => c.total > 0);
  const activeCategory = categoriesWithIndex.find((c) => c.id === filter);

  const diff = data.summary.monthTotal - data.summary.prevMonthTotal;
  const showComparison = data.summary.prevMonthCount > 0;
  const comparisonText = (() => {
    if (!showComparison) return null;
    const prev = monthName(data.summary.prevMonth);
    if (diff > 0) return `naik ${formatCurrency(diff)} dari ${prev}`;
    if (diff < 0) return `turun ${formatCurrency(Math.abs(diff))} dari ${prev}`;
    return `sama dengan ${prev}`;
  })();

  return (
    <>
      <PageHeader
        title="Pengeluaran"
        subtitle="Semua biaya produksi: pembelian bahan, service mesin, sparepart, gas, alat jahit"
        actions={
          <>
            <select
              className="in"
              aria-label="Pilih bulan"
              style={{ width: 170, fontWeight: 600 }}
              value={currentMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            >
              {Array.from(new Set([currentMonth, ...months])).map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>
              Catat pengeluaran
            </Button>
          </>
        }
      />

      <div className={`card ${styles.summaryCard}`}>
        {data.summary.monthTotal === 0 ? (
          <p className="sub" style={{ margin: 0 }}>
            Belum ada pengeluaran di {monthLabel(currentMonth)}
          </p>
        ) : (
          <>
            <div className={styles.summaryLeft}>
              <span className="lbl">Total {monthLabel(currentMonth)}</span>
              <span className={`num ${styles.totalValue}`}>
                {formatCurrency(data.summary.monthTotal)}
              </span>
              <span className="sub">{data.summary.monthCount} catatan</span>
              {comparisonText ? <span className="sub">{comparisonText}</span> : null}
            </div>
            <div className={styles.summaryRight}>
              <div className={styles.stackedBar} aria-hidden="true">
                {visibleCategories.map((cat) => (
                  <i
                    key={cat.id}
                    style={{
                      flex: cat.total,
                      background: catColor(cat.colorIndex),
                    }}
                  />
                ))}
              </div>
              <div className={styles.legend}>
                {visibleCategories.map((cat) => {
                  const pct =
                    data.summary.monthTotal > 0
                      ? (cat.total / data.summary.monthTotal) * 100
                      : 0;
                  const active = filter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`${styles.legendItem} ${active ? styles.legendItemActive : ""}`}
                      onClick={() => onFilterChange(active ? "all" : cat.id)}
                      aria-pressed={active}
                    >
                      <span
                        className={styles.dot}
                        style={{ background: catColor(cat.colorIndex) }}
                        aria-hidden="true"
                      />
                      <span className={styles.legendName}>{cat.name}</span>
                      <span className={styles.legendAmount}>
                        {formatCurrency(cat.total)}
                      </span>
                      <span className={styles.legendPct}>
                        {pct.toFixed(pct >= 10 ? 0 : 1)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <section className="card">
        <div className={`pad ${styles.headerRow}`}>
          <h2 className="h2">Daftar pengeluaran</h2>
        </div>
        {activeCategory ? (
          <div className={styles.filterNote}>
            Menampilkan: <b>{activeCategory.name}</b> ·{" "}
            <button type="button" onClick={() => onFilterChange("all")}>
              Hapus filter
            </button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="sub pad">Belum ada pengeluaran pada bulan ini.</p>
        ) : (
          <div className="tbox">
            <table className="tb">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Keterangan</th>
                  <th scope="col">Mesin</th>
                  <th scope="col">Nota</th>
                  <th scope="col" className="r">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id}>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>
                      {expense.expenseDate.split("-").reverse().join(" ")}
                    </td>
                    <td>
                      <Badge tone={expense.isPurchase ? "accent" : "neutral"}>
                        {expense.categoryName}
                      </Badge>
                    </td>
                    <td>
                      <b>
                        {expense.description ||
                          (expense.items.length
                            ? expense.items
                                .map(
                                  (item) =>
                                    `${item.materialLabel} ${formatQtyStock(item)}`,
                                )
                                .join(", ")
                            : "—")}
                      </b>
                    </td>
                    <td className="sub">{expense.machineName ?? "Tanpa mesin"}</td>
                    <td>
                      {expense.hasReceipt ? (
                        <button type="button" className="btn btn-g btn-sm">
                          Lihat
                        </button>
                      ) : (
                        <span className="sub">Tidak ada</span>
                      )}
                    </td>
                    <td className="r num">
                      <b>{formatCurrency(expense.amount)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen ? (
        <ExpenseFormDrawer
          lookup={lookup}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      ) : null}
    </>
  );
}

function formatQtyStock(item: {
  qtyPurchase: number;
  purchaseUnit: string;
  qtyStock: number;
  stockUnit: string;
}): string {
  return `${formatQtyNumber(item.qtyPurchase)} ${item.purchaseUnit}`;
}

function formatQtyNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}