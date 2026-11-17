import { z } from "zod";

export const photoPrefixSchema = z.enum(["colors", "receipts"]);

export const photoUploadSchema = z.object({
  prefix: photoPrefixSchema,
  size: z
    .number()
    .positive("Foto tidak boleh kosong")
    .max(5 * 1024 * 1024, "Ukuran foto maksimal 5 MB"),
  type: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"], {
    message: "Format foto harus JPG, PNG, WEBP, atau HEIC",
  }),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
