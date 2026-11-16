export function calculatePurchaseLine({
  qtyPurchase,
  purchaseUnit,
  stockUnit,
  factor,
  unitPrice,
}: {
  qtyPurchase: number;
  purchaseUnit: string;
  stockUnit: string;
  factor: number | null;
  unitPrice: number | null;
}): { qtyStock: number; amount: number | null } {
  const multiplier =
    purchaseUnit === stockUnit ? 1 : factor;

  if (multiplier === null || multiplier <= 0) {
    throw new Error("Konversi satuan belum diatur");
  }

  return {
    qtyStock: qtyPurchase * multiplier,
    amount:
      unitPrice === null || unitPrice === undefined
        ? null
        : qtyPurchase * unitPrice,
  };
}
