import { z } from "zod";

export const lineCheckboxSchema = z.object({
  planId: z.string().uuid("Jadwal tidak ditemukan"),
  lineId: z.string().uuid("Baris tidak ditemukan"),
  field: z.enum(["cutDone", "lineDone", "sewingPaid"]),
  value: z.boolean(),
});

export const setTailorSchema = z.object({
  planId: z.string().uuid(),
  lineId: z.string().uuid(),
  tailorName: z.string().trim().max(80).optional(),
});

export const planTransitionSchema = z.object({
  planId: z.string().uuid(),
  to: z.enum(["reserved", "running", "done", "cancelled"]),
});

export const receiveResultSchema = z.object({
  planId: z.string().uuid(),
  planLineId: z.string().uuid(),
  pass: z.coerce.number().int().min(0, "Lolos tidak boleh negatif"),
  defect: z.coerce.number().int().min(0, "Defect tidak boleh negatif"),
  defectReason: z.string().trim().max(200).optional(),
  defectAction: z.enum(["repair", "reject"]).nullable().optional(),
});

export type ReceiveResultInput = z.infer<typeof receiveResultSchema>;