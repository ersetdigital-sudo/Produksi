import { z } from "zod";

export const cellInputSchema = z.object({
  cellId: z.string().uuid(),
  unused: z.boolean(),
  qty: z.coerce.number().min(0, "Jumlah tidak boleh negatif").nullable().optional(),
  materialId: z.string().uuid().nullable().optional(),
  sizes: z
    .array(
      z.object({
        size: z.string().min(1),
        materialId: z.string().uuid().nullable(),
        qty: z.coerce.number().min(0, "Jumlah tidak boleh negatif").nullable(),
      }),
    )
    .optional(),
});

export const seriesInputSchema = z
  .object({
    productId: z.string().uuid(),
    name: z.string().trim().min(1, "Nama series wajib diisi"),
    kind: z.enum(["diproduksi", "turunan"]),
    copyFromSeriesId: z.string().uuid().nullable().optional(),
    parentSeriesId: z.string().uuid().nullable().optional(),
    accessoryMaterialId: z.string().uuid().nullable().optional(),
    accessoryQty: z.coerce
      .number()
      .min(0, "Jumlah tidak boleh negatif")
      .nullable()
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === "turunan") {
      if (!value.parentSeriesId) {
        context.addIssue({
          code: "custom",
          message: "Series induk wajib dipilih",
          path: ["parentSeriesId"],
        });
      }
      if (!value.accessoryMaterialId) {
        context.addIssue({
          code: "custom",
          message: "Aksesoris tambahan wajib dipilih",
          path: ["accessoryMaterialId"],
        });
      }
    }
  });
