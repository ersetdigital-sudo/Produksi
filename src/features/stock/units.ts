export type UnitConversion = {
  fromUnit: string;
  toUnit: string;
  factor: number | null;
};

export function normalizeUnit(unit: string): string {
  return unit === "meter" ? "m" : unit;
}

export function convertQuantity(
  qty: number,
  fromUnit: string,
  toUnit: string,
  conversions: UnitConversion[],
): number {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return qty;

  const direct = conversions.find(
    (item) =>
      normalizeUnit(item.fromUnit) === from &&
      normalizeUnit(item.toUnit) === to &&
      item.factor !== null,
  );
  if (direct?.factor) return qty * direct.factor;

  const inverse = conversions.find(
    (item) =>
      normalizeUnit(item.fromUnit) === to &&
      normalizeUnit(item.toUnit) === from &&
      item.factor !== null,
  );
  if (inverse?.factor) return qty / inverse.factor;

  throw new Error(`Konversi ${fromUnit} ke ${toUnit} belum diatur`);
}

export function isSameUnit(a: string, b: string): boolean {
  return normalizeUnit(a) === normalizeUnit(b);
}
