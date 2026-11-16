import { z } from "zod";

export const materialInputSchema = z
  .object({
    materialTypeId: z.string().uuid("Jenis material wajib dipilih"),
    code: z.string().trim().max(40).optional(),
    name: z.string().trim().max(120).optional(),
    initialStock: z.coerce.number().min(0, "Stok awal tidak boleh negatif").optional(),
    minStock: z.coerce.number().min(0, "Minimum tidak boleh negatif").optional(),
  })
  .refine((value) => Boolean(value.code?.trim() || value.name?.trim()), {
    message: "Isi kode atau nama material",
    path: ["code"],
  });

export type MaterialInput = z.infer<typeof materialInputSchema>;
