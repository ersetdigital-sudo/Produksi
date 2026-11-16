const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatQty(value: string | number | null | undefined): string {
  return numberFormatter.format(toNumber(value));
}

export function formatCurrency(
  value: string | number | null | undefined,
): string {
  return currencyFormatter.format(toNumber(value));
}

export function formatDateId(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
