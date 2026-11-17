import { Swatch } from "@/components/ui/primitives";
import styles from "./colors.module.css";

export function ColorThumb({
  hex,
  photoUrl,
  name,
  size = 14,
  radius = 4,
}: {
  hex: string;
  photoUrl?: string | null;
  name: string;
  size?: number;
  radius?: number;
}) {
  if (!photoUrl) {
    return <Swatch color={hex} size={size} radius={radius} label={`Foto kain ${name}`} />;
  }

  return (
    <span
      className={styles.thumb}
      style={{ width: size, height: size, borderRadius: radius, "--ph": `url(${photoUrl})` } as React.CSSProperties}
      role="img"
      aria-label={`Foto kain ${name}`}
    />
  );
}
