import { z } from "zod";

export const colorPairingInputSchema = z
  .object({
    slotId: z.string().uuid(),
    primaryMaterialId: z.string().uuid().nullable(),
    backupMaterialId: z.string().uuid().nullable(),
  })
  .refine(
    (value) =>
      !value.primaryMaterialId ||
      !value.backupMaterialId ||
      value.primaryMaterialId !== value.backupMaterialId,
    { message: "Kode cadangan harus berbeda dari kode utama" },
  );

export const colorInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nama warna wajib diisi"),
  fabricTypeId: z.string().uuid("Jenis kain wajib dipilih"),
  colorCode: z.string().trim().min(1, "Kode warna wajib diisi"),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus berupa kode hex, misalnya #B79877"),
  productIds: z.array(z.string().uuid()).default([]),
  pairings: z.array(colorPairingInputSchema).default([]),
});

export type ColorInput = z.infer<typeof colorInputSchema>;
