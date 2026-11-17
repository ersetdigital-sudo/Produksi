"use client";

import { useId } from "react";
import { Input } from "@/components/ui/controls";
import styles from "./colorPicker.module.css";

const PRESETS = [
  { hex: "#17171A", label: "Superblack" },
  { hex: "#EFE9DC", label: "Broken White" },
  { hex: "#B79877", label: "Latte" },
  { hex: "#1F2A44", label: "Navy" },
  { hex: "#5B6477", label: "Grey Indigo" },
  { hex: "#BFDCCB", label: "Mint" },
  { hex: "#4A3428", label: "Dark Choco" },
  { hex: "#E4CBB8", label: "Blush Beige" },
  { hex: "#6F4E37", label: "Coffee Brown" },
  { hex: "#6B2030", label: "Deep Maroon" },
  { hex: "#6B6B3A", label: "Olive Green" },
  { hex: "#3F4245", label: "Charcoal Grey" },
];

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const id = useId();
  const safeValue = HEX_PATTERN.test(value) ? value : "#B9BBBD";

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span
          className={styles.preview}
          style={{ "--c": safeValue } as React.CSSProperties}
          aria-hidden="true"
        />
        <label className={styles.picker} htmlFor={`${id}-native`}>
          <input
            id={`${id}-native`}
            type="color"
            value={safeValue}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            aria-label="Pilih warna kain"
          />
          <span>Ambil warna</span>
        </label>
        <Input
          mono
          maxLength={7}
          value={value}
          placeholder="#B79877"
          aria-label="Kode hex warna"
          onChange={(event) => {
            const next = event.target.value.startsWith("#")
              ? event.target.value
              : `#${event.target.value}`;
            onChange(next.toUpperCase());
          }}
        />
      </div>

      <div className={styles.presets} role="group" aria-label="Pilihan warna cepat">
        {PRESETS.map((preset) => {
          const active = preset.hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              className={`${styles.preset} ${active ? styles.presetOn : ""}`}
              onClick={() => onChange(preset.hex)}
              aria-pressed={active}
              title={preset.label}
            >
              <span
                className={styles.presetDot}
                style={{ "--c": preset.hex } as React.CSSProperties}
                aria-hidden="true"
              />
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
