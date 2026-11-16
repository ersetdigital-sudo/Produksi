export type StockStatus =
  | "aman"
  | "menipis"
  | "cadangan"
  | "habis"
  | "kosong";

export type ColorSummary =
  | "aman"
  | "menipis"
  | "cadangan"
  | "habis"
  | "belum";

export function getStockStatus({
  hasPrimary,
  stock,
  min,
  hasBackup = false,
  backupStock = 0,
}: {
  hasPrimary: boolean;
  stock: number;
  min: number;
  hasBackup?: boolean;
  backupStock?: number;
}): StockStatus {
  if (!hasPrimary) return "kosong";
  if (stock <= 0) {
    return hasBackup && backupStock > 0 ? "cadangan" : "habis";
  }
  if (stock < min) return "menipis";
  return "aman";
}

export function summarizeColorStatus(statuses: StockStatus[]): ColorSummary {
  if (statuses.includes("habis")) return "habis";
  if (statuses.includes("cadangan")) return "cadangan";
  if (statuses.includes("menipis")) return "menipis";
  if (statuses.includes("aman")) return "aman";
  return "belum";
}

export function colorSummaryLabel(summary: ColorSummary): string {
  switch (summary) {
    case "habis":
      return "Ada yang habis";
    case "cadangan":
      return "Pakai cadangan";
    case "menipis":
      return "Menipis";
    case "belum":
      return "Belum diisi";
    default:
      return "Aman";
  }
}
