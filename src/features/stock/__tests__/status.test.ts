import { describe, expect, it } from "vitest";
import {
  colorSummaryLabel,
  getStockStatus,
  summarizeColorStatus,
} from "../status";

describe("getStockStatus", () => {
  it("mengembalikan kosong saat kode belum diisi", () => {
    expect(
      getStockStatus({ hasPrimary: false, stock: 0, min: 0 }),
    ).toBe("kosong");
  });

  it("aman saat stok sama dengan minimum", () => {
    expect(
      getStockStatus({ hasPrimary: true, stock: 6, min: 6 }),
    ).toBe("aman");
  });

  it("menipis saat stok di bawah minimum", () => {
    expect(
      getStockStatus({ hasPrimary: true, stock: 5.9, min: 6 }),
    ).toBe("menipis");
  });

  it("pakai cadangan saat utama habis dan cadangan tersedia", () => {
    expect(
      getStockStatus({
        hasPrimary: true,
        stock: 0,
        min: 6,
        hasBackup: true,
        backupStock: 14,
      }),
    ).toBe("cadangan");
  });

  it("habis saat utama dan cadangan kosong", () => {
    expect(
      getStockStatus({
        hasPrimary: true,
        stock: 0,
        min: 6,
        hasBackup: true,
        backupStock: 0,
      }),
    ).toBe("habis");
  });

  it("stok minus tetap habis", () => {
    expect(
      getStockStatus({ hasPrimary: true, stock: -2, min: 6 }),
    ).toBe("habis");
  });
});

describe("summarizeColorStatus", () => {
  it("mengutamakan yang paling mendesak", () => {
    expect(summarizeColorStatus(["aman", "menipis", "habis"])).toBe("habis");
    expect(summarizeColorStatus(["aman", "menipis", "cadangan"])).toBe(
      "cadangan",
    );
    expect(summarizeColorStatus(["aman", "menipis"])).toBe("menipis");
    expect(summarizeColorStatus(["aman", "kosong"])).toBe("aman");
    expect(summarizeColorStatus(["aman", "aman"])).toBe("aman");
    expect(summarizeColorStatus(["kosong", "kosong"])).toBe("belum");
    expect(summarizeColorStatus([])).toBe("belum");
  });

  it("memberi label yang sama dengan mockup", () => {
    expect(colorSummaryLabel("habis")).toBe("Ada yang habis");
    expect(colorSummaryLabel("belum")).toBe("Belum diisi");
  });
});
