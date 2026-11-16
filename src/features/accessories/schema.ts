import { z } from "zod";

export const assemblySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  childSeriesId: z.string().uuid("Series turunan wajib dipilih"),
  parentSeriesId: z.string().uuid("Series induk tidak ditemukan"),
  colorId: z.string().uuid("Warna wajib dipilih"),
  size: z.string().trim().min(1, "Size wajib dipilih"),
  qty: z.coerce.number().int().positive("Jumlah harus lebih dari 0"),
  orderNo: z.string().trim().max(60).optional(),
  note: z.string().trim().max(200).optional(),
});

export type AssemblyInput = z.infer<typeof assemblySchema>;