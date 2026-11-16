type MaterialGroup =
  | "warna"
  | "kain_keras"
  | "penguat"
  | "label"
  | "packing"
  | "aksesoris";

export function materialSatuanText(
  unit: string,
  group: MaterialGroup,
): string {
  if (unit === "cone") {
    return "Stok dihitung per cone, dibeli per lusin (1 lusin = 12 cone).";
  }
  if (unit === "gross") {
    return "Stok dihitung per gross (1 gross = 144 pcs).";
  }
  if (unit === "m") {
    return "Stok dihitung per meter.";
  }
  if (group === "aksesoris") {
    return "Dihitung per pcs, dibeli per gross (1 gross = 144 pcs). Terpotong saat Pasang Aksesoris.";
  }
  return "Stok dihitung per pcs.";
}
