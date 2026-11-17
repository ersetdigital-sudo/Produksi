import "server-only";

export const PHOTO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

function config() {
  if (!SUPABASE_URL || !SERVICE_KEY || !PHOTO_BUCKET) {
    throw new Error(
      "Penyimpanan foto belum diatur: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan SUPABASE_STORAGE_BUCKET wajib diisi.",
    );
  }
  return {
    url: SUPABASE_URL.replace(/\/$/, ""),
    bucket: PHOTO_BUCKET,
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  };
}

export async function putPhoto(
  path: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { url, bucket, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Gagal mengunggah foto (${res.status})`);
  }
}

export async function deletePhoto(path: string): Promise<void> {
  const { url, bucket, headers } = config();
  await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "DELETE",
    headers,
  });
}

export async function signPhotos(
  paths: string[],
  expiresIn = 3600,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const { url, bucket, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/sign/${bucket}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn, paths: unique }),
  });
  if (!res.ok) return result;

  const rows = (await res.json()) as { path: string; signedURL?: string | null }[];
  for (const row of rows) {
    if (row.signedURL) {
      result.set(row.path, `${url}/storage/v1${row.signedURL}`);
    }
  }
  return result;
}
