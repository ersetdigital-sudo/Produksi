import { z } from "zod";

export const slotInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nama slot wajib diisi"),
  materialTypeId: z.string().uuid("Jenis material wajib dipilih"),
});

export const materialTypeInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nama jenis material wajib diisi"),
  unit: z.string().trim().min(1, "Satuan stok wajib diisi"),
  defaultMin: z.coerce.number().min(0, "Minimum tidak boleh negatif"),
});

export const conversionInputSchema = z.object({
  id: z.string().uuid().optional(),
  fromUnit: z.string().trim().min(1, "Satuan beli wajib diisi"),
  toUnit: z.string().trim().min(1, "Satuan stok wajib diisi"),
  factor: z.coerce.number().positive("Jumlah konversi harus lebih dari 0").nullable(),
  scope: z.string().trim().min(1, "Dipakai untuk wajib dipilih"),
});

export const expenseCategoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nama kategori wajib diisi"),
  requiresMachine: z.boolean(),
});
