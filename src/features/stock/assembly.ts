export type AssemblyAccessory = {
  materialId: string;
  qtyPerPiece: number | null;
  unit: string;
};

export type AssemblyDeltas = {
  finished: {
    seriesId: string;
    colorId: string;
    size: string;
    qty: number;
  }[];
  materials: {
    materialId: string;
    qty: number;
    unit: string;
  }[];
};

export function computeAssemblyDeltas({
  qty,
  parentSeriesId,
  childSeriesId,
  colorId,
  size,
  accessories,
}: {
  qty: number;
  parentSeriesId: string;
  childSeriesId: string;
  colorId: string;
  size: string;
  accessories: AssemblyAccessory[];
}): AssemblyDeltas {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error("Jumlah baju harus bilangan bulat lebih dari 0");
  }
  if (accessories.length === 0) {
    throw new Error("Series turunan belum punya aksesoris");
  }
  if (accessories.some((item) => item.qtyPerPiece === null)) {
    throw new Error("Jumlah aksesoris per baju belum diisi");
  }

  return {
    finished: [
      { seriesId: parentSeriesId, colorId, size, qty: -qty },
      { seriesId: childSeriesId, colorId, size, qty },
    ],
    materials: accessories.map((item) => ({
      materialId: item.materialId,
      qty: -(item.qtyPerPiece ?? 0) * qty,
      unit: item.unit,
    })),
  };
}
