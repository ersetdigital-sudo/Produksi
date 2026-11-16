import "server-only";

import type { db } from "@/db/client";
import {
  finishedGoodsMovements,
  stockMovements,
} from "@/db/schema";
import type { AssemblyDeltas } from "./assembly";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type StockMovementInput = {
  materialId: string;
  qty: number;
  unit: string;
  kind:
    | "purchase_in"
    | "in"
    | "out"
    | "production_out"
    | "production_return"
    | "assembly_out"
    | "opname"
    | "reserve"
    | "adjustment";
  referenceType?: string | null;
  referenceId?: string | null;
  colorId?: string | null;
  note?: string | null;
  occurredAt?: Date;
  createdBy?: string | null;
};

export async function appendStockMovement(
  tx: Tx,
  input: StockMovementInput,
): Promise<void> {
  if (input.qty === 0 && input.kind !== "reserve") return;
  await tx.insert(stockMovements).values({
    materialId: input.materialId,
    qty: String(input.qty),
    unit: input.unit,
    kind: input.kind,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    colorId: input.colorId ?? null,
    note: input.note ?? null,
    occurredAt: input.occurredAt ?? new Date(),
    createdBy: input.createdBy ?? null,
  });
}

type FinishedGoodsInput = {
  seriesId: string;
  colorId: string;
  size: string;
  qty: number;
  kind: "production_in" | "assembly_in" | "assembly_out" | "opname" | "adjustment";
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  occurredAt?: Date;
  createdBy?: string | null;
};

export async function appendFinishedGoodsMovement(
  tx: Tx,
  input: FinishedGoodsInput,
): Promise<void> {
  if (input.qty === 0) return;
  await tx.insert(finishedGoodsMovements).values({
    seriesId: input.seriesId,
    colorId: input.colorId,
    size: input.size,
    qty: input.qty,
    kind: input.kind,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    note: input.note ?? null,
    occurredAt: input.occurredAt ?? new Date(),
    createdBy: input.createdBy ?? null,
  });
}

export async function recordReserve(
  tx: Tx,
  {
    planId,
    poNumber,
    requirements,
    actorId,
    occurredAt,
  }: {
    planId: string;
    poNumber: string;
    requirements: { materialId: string; qty: number; unit: string }[];
    actorId: string | null;
    occurredAt: Date;
  },
): Promise<void> {
  for (const item of requirements) {
    const released = item.qty < 0;
    await appendStockMovement(tx, {
      materialId: item.materialId,
      qty: 0,
      unit: item.unit,
      kind: "reserve",
      referenceType: "production_plan",
      referenceId: planId,
      note: released
        ? `Cadangan dilepas ${poNumber} · ${-item.qty} ${item.unit}`
        : `Cadangan ${poNumber} · ${item.qty} ${item.unit}`,
      occurredAt,
      createdBy: actorId,
    });
  }
}

export async function recordProductionOut(
  tx: Tx,
  {
    planId,
    poNumber,
    requirements,
    actorId,
    occurredAt,
  }: {
    planId: string;
    poNumber: string;
    requirements: { materialId: string; qty: number; unit: string }[];
    actorId: string | null;
    occurredAt: Date;
  },
): Promise<void> {
  for (const item of requirements) {
    await appendStockMovement(tx, {
      materialId: item.materialId,
      qty: -item.qty,
      unit: item.unit,
      kind: "production_out",
      referenceType: "production_plan",
      referenceId: planId,
      note: `Keluar ke produksi ${poNumber}`,
      occurredAt,
      createdBy: actorId,
    });
  }
}

export async function recordProductionReturn(
  tx: Tx,
  {
    planId,
    poNumber,
    items,
    actorId,
    occurredAt,
    note,
  }: {
    planId: string;
    poNumber: string;
    items: { materialId: string; qty: number; unit: string }[];
    actorId: string | null;
    occurredAt: Date;
    note?: string | null;
  },
): Promise<void> {
  for (const item of items) {
    await appendStockMovement(tx, {
      materialId: item.materialId,
      qty: item.qty,
      unit: item.unit,
      kind: "production_return",
      referenceType: "production_plan",
      referenceId: planId,
      note: note ?? `Sisa bahan ${poNumber}`,
      occurredAt,
      createdBy: actorId,
    });
  }
}

export async function recordResultPass(
  tx: Tx,
  {
    planId,
    poNumber,
    seriesId,
    colorId,
    size,
    passQty,
    actorId,
    occurredAt,
  }: {
    planId: string;
    poNumber: string;
    seriesId: string;
    colorId: string;
    size: string;
    passQty: number;
    actorId: string | null;
    occurredAt: Date;
  },
): Promise<void> {
  await appendFinishedGoodsMovement(tx, {
    seriesId,
    colorId,
    size,
    qty: passQty,
    kind: "production_in",
    referenceType: "production_plan",
    referenceId: planId,
    note: `Terima hasil ${poNumber} · ${size}`,
    occurredAt,
    createdBy: actorId,
  });
}

export async function recordAssembly(
  tx: Tx,
  {
    assemblyId,
    deltas,
    actorId,
    occurredAt,
    note,
  }: {
    assemblyId: string;
    deltas: AssemblyDeltas;
    actorId: string | null;
    occurredAt: Date;
    note?: string | null;
  },
): Promise<void> {
  for (const item of deltas.finished) {
    await appendFinishedGoodsMovement(tx, {
      seriesId: item.seriesId,
      colorId: item.colorId,
      size: item.size,
      qty: item.qty,
      kind: item.qty > 0 ? "assembly_in" : "assembly_out",
      referenceType: "assembly",
      referenceId: assemblyId,
      note: note ?? "Pasang aksesoris",
      occurredAt,
      createdBy: actorId,
    });
  }

  for (const item of deltas.materials) {
    await appendStockMovement(tx, {
      materialId: item.materialId,
      qty: item.qty,
      unit: item.unit,
      kind: "assembly_out",
      referenceType: "assembly",
      referenceId: assemblyId,
      note: note ?? "Pasang aksesoris",
      occurredAt,
      createdBy: actorId,
    });
  }
}
