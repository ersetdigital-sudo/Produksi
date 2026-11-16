import { describe, expect, it } from "vitest";
import { computeAssemblyDeltas } from "../assembly";
import { computeOpnameDelta, opnameNote } from "../opname";
import { resolveOutboundMaterial } from "../outbound";
import { calculatePurchaseLine } from "../purchase";
import { computeRequirements } from "../requirements";
import { isPlanComplete, validateLineResult } from "../results";
import { convertQuantity } from "../units";
import { canTransition } from "../workflow";

describe("alur pembelian bahan", () => {
  it("mengonversi gross ke pcs dan menghitung nilai", () => {
    expect(
      calculatePurchaseLine({
        qtyPurchase: 2,
        purchaseUnit: "gross",
        stockUnit: "pcs",
        factor: 144,
        unitPrice: 1000,
      }),
    ).toEqual({ qtyStock: 288, amount: 2000 });
  });

  it("tidak butuh konversi saat satuan sama", () => {
    expect(
      calculatePurchaseLine({
        qtyPurchase: 5,
        purchaseUnit: "pcs",
        stockUnit: "pcs",
        factor: null,
        unitPrice: 5000,
      }),
    ).toEqual({ qtyStock: 5, amount: 25000 });
  });

  it("menolak konversi yang belum diatur", () => {
    expect(() =>
      calculatePurchaseLine({
        qtyPurchase: 1,
        purchaseUnit: "pak",
        stockUnit: "pcs",
        factor: null,
        unitPrice: null,
      }),
    ).toThrow("Konversi satuan belum diatur");
  });
});

describe("alur stok keluar dan cadangan", () => {
  it("memakai kode cadangan saat utama habis", () => {
    expect(
      resolveOutboundMaterial(
        {
          primaryMaterialId: "utama",
          backupMaterialId: "cadangan",
          primaryStock: 0,
          backupStock: 14,
        },
        true,
      ),
    ).toEqual({ materialId: "cadangan", usedBackup: true });
  });

  it("tetap memakai utama kalau stok utama masih ada", () => {
    expect(
      resolveOutboundMaterial(
        {
          primaryMaterialId: "utama",
          backupMaterialId: "cadangan",
          primaryStock: 4,
          backupStock: 14,
        },
        true,
      ),
    ).toEqual({ materialId: "utama", usedBackup: false });
  });

  it("tidak memakai cadangan tanpa persetujuan", () => {
    expect(
      resolveOutboundMaterial(
        {
          primaryMaterialId: "utama",
          backupMaterialId: "cadangan",
          primaryStock: 0,
          backupStock: 14,
        },
        false,
      ),
    ).toEqual({ materialId: "utama", usedBackup: false });
  });
});

describe("alur opname", () => {
  it("mencatat selisih plus dan minus", () => {
    expect(computeOpnameDelta(12, 14)).toBe(-2);
    expect(computeOpnameDelta(20, 18)).toBe(2);
    expect(opnameNote(12, 14, "lupa dicatat")).toContain("-2");
  });
});

describe("konversi satuan", () => {
  it("mendukung konversi langsung dan terbalik", () => {
    const conversions = [
      { fromUnit: "gross", toUnit: "pcs", factor: 144 },
      { fromUnit: "lusin", toUnit: "cone", factor: 12 },
    ];
    expect(convertQuantity(2, "gross", "pcs", conversions)).toBe(288);
    expect(convertQuantity(6, "pcs", "gross", conversions)).toBe(0.041666666666666664);
    expect(convertQuantity(2, "lusin", "cone", conversions)).toBe(24);
    expect(convertQuantity(1, "meter", "m", conversions)).toBe(1);
  });
});

describe("alur kebutuhan bahan dan cadangan", () => {
  const base = {
    lines: [
      {
        id: "L1",
        productId: "P1",
        seriesId: "S1",
        colorId: "C1",
        size: "M",
        qty: 10,
      },
    ],
    rows: [
      {
        id: "R1",
        productId: "P1",
        name: "Benang jahit",
        pattern: "warna" as const,
        pairingSlotId: "SL1",
      },
      {
        id: "R2",
        productId: "P1",
        name: "Kancing snap",
        pattern: "sama" as const,
        pairingSlotId: null,
      },
      {
        id: "R3",
        productId: "P1",
        name: "Label size",
        pattern: "size" as const,
        pairingSlotId: null,
      },
      {
        id: "R4",
        productId: "P1",
        name: "Plaket",
        pattern: "series" as const,
        pairingSlotId: null,
      },
    ],
    cells: [
      {
        rowId: "R1",
        seriesId: "S1",
        materialId: null,
        qty: 0.1,
        unit: "cone",
        unused: false,
      },
      {
        rowId: "R2",
        seriesId: "S1",
        materialId: "M2",
        qty: 2,
        unit: "pcs",
        unused: false,
      },
      {
        rowId: "R3",
        seriesId: "S1",
        materialId: null,
        qty: null,
        unit: null,
        unused: false,
      },
      {
        rowId: "R4",
        seriesId: "S1",
        materialId: "M4",
        qty: 1,
        unit: "m",
        unused: false,
      },
    ],
    sizeCells: [
      {
        rowId: "R3",
        seriesId: "S1",
        size: "M",
        materialId: "M3",
        qty: 1,
      },
    ],
    pairings: [
      {
        colorId: "C1",
        slotId: "SL1",
        primaryMaterialId: "M1",
        backupMaterialId: "M1B",
      },
    ],
    materials: [
      {
        id: "M1",
        code: "722",
        name: "Hitam",
        unit: "cone",
        stock: 24,
      },
      {
        id: "M1B",
        code: "069",
        name: null,
        unit: "cone",
        stock: 14,
      },
      {
        id: "M2",
        code: null,
        name: "Kancing snap",
        unit: "pcs",
        stock: 600,
      },
      {
        id: "M3",
        code: "M",
        name: "Label size",
        unit: "pcs",
        stock: 40,
      },
      {
        id: "M4",
        code: null,
        name: "Plaket",
        unit: "m",
        stock: 10,
      },
    ],
    colors: [{ id: "C1", name: "Superblack" }],
    conversions: [{ fromUnit: "gross", toUnit: "pcs", factor: 144 }],
  };

  it("menghitung pola warna, sama, size, series", () => {
    const result = computeRequirements(base);
    expect(result.issues).toHaveLength(0);
    expect(
      result.requirements.map((item) => [
        item.materialId,
        item.requiredQty,
        item.unit,
      ]),
    ).toEqual([
      ["M1", 1, "cone"],
      ["M2", 20, "pcs"],
      ["M3", 10, "pcs"],
      ["M4", 10, "m"],
    ]);
  });

  it("memakai cadangan saat stok utama habis", () => {
    const result = computeRequirements({
      ...base,
      materials: base.materials.map((item) =>
        item.id === "M1" ? { ...item, stock: 0 } : item,
      ),
    });
    const benang = result.requirements.find(
      (item) => item.materialId === "M1B",
    );
    expect(benang?.usedBackup).toBe(true);
    expect(benang?.requiredQty).toBe(1);
  });

  it("menandai kode dan takaran yang belum diisi", () => {
    const result = computeRequirements({
      ...base,
      pairings: [],
      sizeCells: [],
      cells: base.cells.map((cell) =>
        cell.rowId === "R4" ? { ...cell, qty: null } : cell,
      ),
    });
    expect(result.issues.some((item) => item.reason === "kode_belum_diisi")).toBe(
      true,
    );
    expect(
      result.issues.some((item) => item.reason === "takaran_belum_diisi"),
    ).toBe(true);
  });

  it("menolak sel yang tidak dipakai", () => {
    const result = computeRequirements({
      ...base,
      cells: base.cells.map((cell) =>
        cell.rowId === "R2" ? { ...cell, unused: true } : cell,
      ),
    });
    expect(result.requirements.some((item) => item.materialId === "M2")).toBe(
      false,
    );
  });
});

describe("alur terima hasil", () => {
  it("menerima hasil bertahap dan menghitung delta", () => {
    expect(
      validateLineResult({
        target: 5,
        existingPass: 0,
        existingDefect: 0,
        nextPass: 4,
        nextDefect: 1,
        defectReason: "Noda",
        defectAction: "reject",
      }),
    ).toEqual({ ok: true, deltaPass: 4, deltaDefect: 1 });
  });

  it("menolak total melebihi target", () => {
    expect(
      validateLineResult({
        target: 5,
        existingPass: 0,
        existingDefect: 0,
        nextPass: 6,
        nextDefect: 0,
      }),
    ).toEqual({ ok: false, error: "Lolos + defect melebihi target 5 pcs." });
  });

  it("menolak pengurangan hasil yang sudah diterima", () => {
    expect(
      validateLineResult({
        target: 5,
        existingPass: 3,
        existingDefect: 0,
        nextPass: 2,
        nextDefect: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("defect baru wajib alasan dan tindak lanjut", () => {
    expect(
      validateLineResult({
        target: 5,
        existingPass: 0,
        existingDefect: 0,
        nextPass: 5,
        nextDefect: 1,
      }),
    ).toMatchObject({ ok: false });
  });

  it("selesai hanya jika semua baris cocok", () => {
    expect(
      isPlanComplete(
        [
          { id: "L1", qty: 5 },
          { id: "L2", qty: 2 },
        ],
        {
          L1: { passQty: 4, defectQty: 1 },
          L2: { passQty: 1, defectQty: 1 },
        },
      ),
    ).toBe(true);
    expect(
      isPlanComplete([{ id: "L1", qty: 5 }], {
        L1: { passQty: 4, defectQty: 0 },
      }),
    ).toBe(false);
  });
});

describe("alur pasang aksesoris", () => {
  it("mengurangi rak induk, menambah rak turunan, memotong aksesoris", () => {
    expect(
      computeAssemblyDeltas({
        qty: 2,
        parentSeriesId: "Jiharkah",
        childSeriesId: "Imron",
        colorId: "C1",
        size: "L",
        accessories: [
          { materialId: "diamond", qtyPerPiece: 6, unit: "pcs" },
        ],
      }),
    ).toEqual({
      finished: [
        { seriesId: "Jiharkah", colorId: "C1", size: "L", qty: -2 },
        { seriesId: "Imron", colorId: "C1", size: "L", qty: 2 },
      ],
      materials: [{ materialId: "diamond", qty: -12, unit: "pcs" }],
    });
  });

  it("menolak aksesoris yang takarannya belum diisi", () => {
    expect(() =>
      computeAssemblyDeltas({
        qty: 1,
        parentSeriesId: "Jiharkah",
        childSeriesId: "Imron",
        colorId: "C1",
        size: "M",
        accessories: [{ materialId: "diamond", qtyPerPiece: null, unit: "pcs" }],
      }),
    ).toThrow("belum diisi");
  });
});

describe("status jadwal", () => {
  it("hanya mengizinkan transisi yang disepakati", () => {
    expect(canTransition("draft", "reserved")).toBe(true);
    expect(canTransition("reserved", "running")).toBe(true);
    expect(canTransition("running", "done")).toBe(true);
    expect(canTransition("draft", "running")).toBe(false);
    expect(canTransition("done", "cancelled")).toBe(false);
  });
});
