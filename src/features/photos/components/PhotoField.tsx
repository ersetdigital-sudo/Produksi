"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import { removePhoto, uploadPhoto } from "../actions";
import styles from "./photo.module.css";

export type PhotoValue = { path: string | null; url: string | null };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function PhotoField({
  label,
  prefix,
  value,
  onChange,
  hint,
}: {
  label: string;
  prefix: "colors" | "receipts";
  value: PhotoValue;
  onChange: (next: PhotoValue) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format foto harus JPG, PNG, WEBP, atau HEIC.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("prefix", prefix);
      const result = await uploadPhoto(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange({ path: result.path, url: result.url });
    });
  };

  const clear = () => {
    const previous = value.path;
    setError(null);
    onChange({ path: null, url: null });
    if (previous) {
      startTransition(async () => {
        await removePhoto(previous);
      });
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="flabel">{label}</span>
        {value.path ? (
          <Button variant="ghost" size="sm" type="button" onClick={clear} disabled={pending}>
            <Icon name="trash" size={16} />
            Hapus foto
          </Button>
        ) : null}
      </div>

      {value.url ? (
        <button type="button" className={styles.preview} onClick={pick} disabled={pending}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={label} className={styles.image} />
          <span className={styles.overlay}>
            <Icon name="camera" size={16} />
            Ganti foto
          </span>
        </button>
      ) : (
        <button type="button" className={styles.placeholder} onClick={pick} disabled={pending}>
          <Icon name={pending ? "image" : "camera"} />
          {pending ? "Mengunggah…" : "Pilih atau ambil foto"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className={styles.input}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error ? <span className={styles.error}>{error}</span> : null}
      {!error && hint ? <span className="sub">{hint}</span> : null}
    </div>
  );
}
