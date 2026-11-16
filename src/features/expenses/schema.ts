import { z } from "zod";

const expenseDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");

export const expenseLineSchema = z
  .object({
    materialId: z.string().uuid("Item wajib dipilih"),
    qtyPurchase: z.coerce
      .number()
      .positive("Jumlah harus lebih dari 0"),
    purchaseUnit: z.string().trim().min(1, "Satuan beli wajib diisi"),
    conversionFactor: z.coerce
      .number()
      .positive("Konversi belum diatur")
      .nullable(),
    unitPrice: z.coerce.number().min(0).nullable(),
  });

export const expenseSheetSchema = z.object({
  date: expenseDate,
  categoryId: z.string().uuid("Kategori wajib dipilih"),
  machineId: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
  description: z.string().trim().max(200).optional(),
  items: z.array(expenseLineSchema).default([]),
  receiptPath: z.string().nullable().optional(),
});

export type ExpenseSheetInput = z.infer<typeof expenseSheetSchema>;
export type ExpenseLineInput = z.infer<typeof expenseLineSchema>;