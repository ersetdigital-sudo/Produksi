"use client";

import { useRouter } from "next/navigation";
import { ExpensePage } from "./ExpensePage";
import type { ExpenseLookup } from "../queries";

export function ExpensePageShell({
  data,
  lookup,
  months,
  currentMonth,
  filter,
}: {
  data: { summary: import("../queries").ExpenseSummary; expenses: import("../queries").ExpenseView[] };
  lookup: ExpenseLookup;
  months: string[];
  currentMonth: string;
  filter: string;
}) {
  const router = useRouter();

  const setMonth = (value: string) => {
    const sp = new URLSearchParams();
    if (value) sp.set("bulan", value);
    if (filter !== "all") sp.set("kategori", filter);
    const qs = sp.toString();
    router.push(qs ? `/pengeluaran?${qs}` : "/pengeluaran");
  };

  const setFilter = (value: string) => {
    const sp = new URLSearchParams();
    sp.set("bulan", currentMonth);
    if (value !== "all") sp.set("kategori", value);
    router.push(`/pengeluaran?${sp.toString()}`);
  };

  return (
    <ExpensePage
      data={data}
      lookup={lookup}
      months={months}
      currentMonth={currentMonth}
      filter={filter}
      onMonthChange={setMonth}
      onFilterChange={setFilter}
    />
  );
}