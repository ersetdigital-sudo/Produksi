"use server";

import { randomUUID } from "node:crypto";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  deletePhoto,
  putPhoto,
  signPhotos,
} from "./storage";
import { photoUploadSchema } from "./schema";

export type PhotoActionResult =
  | { ok: true; path: string; url: string | null }
  | { ok: false; error: string };

function todayFolder(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}/${month}`;
}

export async function uploadPhoto(
  formData: FormData,
): Promise<PhotoActionResult> {
  const file = formData.get("file");
  const prefix = formData.get("prefix");

  if (!(file instanceof File)) {
    return { ok: false, error: "Foto belum dipilih." };
  }

  const parsed = photoUploadSchema.safeParse({
    prefix,
    size: file.size,
    type: file.type,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Foto tidak valid",
    };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 5 MB." };
  }

  const extension = ALLOWED_PHOTO_TYPES[parsed.data.type];
  if (!extension) {
    return { ok: false, error: "Format foto tidak didukung." };
  }

  const path = `${parsed.data.prefix}/${todayFolder()}/${randomUUID()}.${extension}`;

  try {
    await putPhoto(path, await file.arrayBuffer(), parsed.data.type);
    const urls = await signPhotos([path]);
    return { ok: true, path, url: urls.get(path) ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal mengunggah foto.",
    };
  }
}

export async function removePhoto(path: string): Promise<{ ok: true }> {
  await deletePhoto(path);
  return { ok: true };
}
