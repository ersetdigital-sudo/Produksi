import type { Metadata } from "next";
import { ExpensePageShell } from "@/features/expenses/components/ExpensePageShell";
import {
  getExpenseLookup,
  getExpensePage,
  listExpenseMonths,
} from "@/features/expenses/queries";

export const metadata: Metadata = { title: "Pengeluaran" };
export const dynamic = "force-dynamic";

export default async function PengeluaranRoute({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; kategori?: string }>;
}) {
  const params = await searchParams;
  const lookup = await getExpenseLookup();
  const months = await listExpenseMonths();
  const currentMonth = params.bulan ?? lookup.currentMonth;
  const { expenses, summary } = await getExpensePage(currentMonth);

  return (
    <ExpensePageShell
      data={{ expenses, summary }}
      lookup={lookup}
      months={months}
      currentMonth={currentMonth}
      filter={params.kategori ?? "all"}
    />
  );
}
