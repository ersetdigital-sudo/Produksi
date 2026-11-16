import { convertQuantity, type UnitConversion } from "./units";

export type PlanLineInput = {
  id: string;
  productId: string;
  seriesId: string;
  colorId: string;
  size: string;
  qty: number;
};

export type BomRowInput = {
  id: string;
  productId: string;
  name: string;
  pattern: "warna" | "size" | "series" | "sama";
  pairingSlotId: string | null;
};

export type BomCellInput = {
  rowId: string;
  seriesId: string;
  materialId: string | null;
  qty: number | null;
  unit: string | null;
  unused: boolean;
};

export type BomSizeInput = {
  rowId: string;
  seriesId: string;
  size: string;
  materialId: string | null;
  qty: number | null;
};

export type PairingInput = {
  colorId: string;
  slotId: string;
  primaryMaterialId: string | null;
  backupMaterialId: string | null;
};

export type RequirementMaterial = {
  id: string;
  code: string | null;
  name: string | null;
  unit: string;
  stock: number;
};

export type RequirementIssue = {
  planLineId: string;
  bomRowId: string;
  reason: "kode_belum_diisi" | "takaran_belum_diisi";
  detail: string;
};

export type PlanRequirement = {
  materialId: string;
  code: string | null;
  name: string | null;
  unit: string;
  requiredQty: number;
  usedBackup: boolean;
  colorIds: string[];
  colors: string[];
  rowNames: string[];
};

export type RequirementsResult = {
  requirements: PlanRequirement[];
  issues: RequirementIssue[];
};

export function computeRequirements({
  lines,
  rows,
  cells,
  sizeCells,
  pairings,
  materials,
  colors,
  conversions,
}: {
  lines: PlanLineInput[];
  rows: BomRowInput[];
  cells: BomCellInput[];
  sizeCells: BomSizeInput[];
  pairings: PairingInput[];
  materials: RequirementMaterial[];
  colors: { id: string; name: string }[];
  conversions: UnitConversion[];
}): RequirementsResult {
  const materialMap = new Map(materials.map((item) => [item.id, item]));
  const colorMap = new Map(colors.map((item) => [item.id, item]));
  const pairingMap = new Map(
    pairings.map((item) => [`${item.colorId}:${item.slotId}`, item]),
  );
  const cellMap = new Map(
    cells.map((item) => [`${item.rowId}:${item.seriesId}`, item]),
  );
  const sizeMap = new Map(
    sizeCells.map((item) => [
      `${item.rowId}:${item.seriesId}:${item.size}`,
      item,
    ]),
  );

  const issueKeys = new Set<string>();
  const issues: RequirementIssue[] = [];
  const requirementMap = new Map<string, PlanRequirement>();
  const order: string[] = [];

  const addIssue = (
    line: PlanLineInput,
    row: BomRowInput,
    reason: RequirementIssue["reason"],
    detail: string,
  ) => {
    const key = `${line.id}:${row.id}:${reason}`;
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push({
      planLineId: line.id,
      bomRowId: row.id,
      reason,
      detail,
    });
  };

  const addQuantity = (
    line: PlanLineInput,
    row: BomRowInput,
    materialId: string,
    qty: number,
    fromUnit: string,
    usedBackup: boolean,
  ) => {
    const material = materialMap.get(materialId);
    if (!material) {
      addIssue(line, row, "kode_belum_diisi", `${row.name}: kode tidak ditemukan`);
      return;
    }

    let qtyInStockUnit = qty * line.qty;
    try {
      qtyInStockUnit = convertQuantity(
        qty * line.qty,
        fromUnit,
        material.unit,
        conversions,
      );
    } catch {
      addIssue(
        line,
        row,
        "takaran_belum_diisi",
        `${row.name}: satuan ${fromUnit} ke ${material.unit} belum diatur`,
      );
      return;
    }

    const existing = requirementMap.get(materialId);
    const color = colorMap.get(line.colorId);
    if (existing) {
      existing.requiredQty += qtyInStockUnit;
      existing.usedBackup = existing.usedBackup || usedBackup;
      if (!existing.colorIds.includes(line.colorId)) {
        existing.colorIds.push(line.colorId);
        if (color) existing.colors.push(color.name);
      }
      if (!existing.rowNames.includes(row.name)) existing.rowNames.push(row.name);
      return;
    }

    order.push(materialId);
    requirementMap.set(materialId, {
      materialId,
      code: material.code,
      name: material.name,
      unit: material.unit,
      requiredQty: qtyInStockUnit,
      usedBackup,
      colorIds: [line.colorId],
      colors: color ? [color.name] : [],
      rowNames: [row.name],
    });
  };

  for (const line of lines) {
    const color = colorMap.get(line.colorId);
    const productRows = rows.filter((row) => row.productId === line.productId);

    for (const row of productRows) {
      const cell = cellMap.get(`${row.id}:${line.seriesId}`);
      if (!cell) {
        addIssue(
          line,
          row,
          "takaran_belum_diisi",
          `${row.name}: sel series belum dibuat`,
        );
        continue;
      }
      if (cell.unused) continue;

      if (row.pattern === "warna") {
        if (!row.pairingSlotId) {
          addIssue(
            line,
            row,
            "kode_belum_diisi",
            `${row.name}: slot pasangan belum diatur`,
          );
          continue;
        }
        const pairing = pairingMap.get(`${line.colorId}:${row.pairingSlotId}`);
        if (!pairing?.primaryMaterialId) {
          addIssue(
            line,
            row,
            "kode_belum_diisi",
            `${row.name}: kode warna ${color?.name ?? ""} belum diisi`,
          );
          continue;
        }
        if (cell.qty === null) {
          addIssue(
            line,
            row,
            "takaran_belum_diisi",
            `${row.name}: takaran per baju belum diisi`,
          );
          continue;
        }

        const primary = materialMap.get(pairing.primaryMaterialId);
        const backup = pairing.backupMaterialId
          ? materialMap.get(pairing.backupMaterialId)
          : null;
        const useBackup =
          Boolean(primary && primary.stock <= 0 && backup && backup.stock > 0);

        addQuantity(
          line,
          row,
          useBackup && pairing.backupMaterialId
            ? pairing.backupMaterialId
            : pairing.primaryMaterialId,
          cell.qty,
          cell.unit ?? primary?.unit ?? "pcs",
          useBackup,
        );
        continue;
      }

      if (row.pattern === "size") {
        const sizeCell = sizeMap.get(
          `${row.id}:${line.seriesId}:${line.size}`,
        );
        if (!sizeCell?.materialId) {
          addIssue(
            line,
            row,
            "kode_belum_diisi",
            `${row.name}: kode size ${line.size} belum diisi`,
          );
          continue;
        }
        if (sizeCell.qty === null) {
          addIssue(
            line,
            row,
            "takaran_belum_diisi",
            `${row.name}: takaran size ${line.size} belum diisi`,
          );
          continue;
        }
        addQuantity(
          line,
          row,
          sizeCell.materialId,
          sizeCell.qty,
          materialMap.get(sizeCell.materialId)?.unit ?? "pcs",
          false,
        );
        continue;
      }

      if (!cell.materialId) {
        addIssue(
          line,
          row,
          "kode_belum_diisi",
          `${row.name}: item belum diisi`,
        );
        continue;
      }
      if (cell.qty === null) {
        addIssue(
          line,
          row,
          "takaran_belum_diisi",
          `${row.name}: takaran per baju belum diisi`,
        );
        continue;
      }
      addQuantity(
        line,
        row,
        cell.materialId,
        cell.qty,
        cell.unit ?? materialMap.get(cell.materialId)?.unit ?? "pcs",
        false,
      );
    }
  }

  return {
    requirements: order
      .map((id) => requirementMap.get(id))
      .filter((item): item is PlanRequirement => Boolean(item)),
    issues,
  };
}
