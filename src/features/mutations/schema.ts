import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");

export const manualOutSchema = z.object({
  date: dateString,
  note: z.string().trim().max(200).optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        qty: z.coerce.number().positive("Jumlah harus lebih dari 0"),
        colorId: z.string().uuid().nullable().optional(),
        usedBackup: z.boolean().optional(),
      }),
    )
    .min(1, "Isi minimal satu jumlah keluar"),
});

export const manualInSchema = z.object({
  date: dateString,
  materialId: z.string().uuid("Material wajib dipilih"),
  qty: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  unit: z.string().trim().min(1, "Satuan wajib diisi"),
  note: z.string().trim().max(200).optional(),
});

export const opnameSchema = z.object({
  date: dateString,
  materialId: z.string().uuid("Material wajib dipilih"),
  countedQty: z.coerce.number().min(0, "Hasil hitung tidak boleh negatif"),
  reason: z.string().trim().max(200).optional(),
});
