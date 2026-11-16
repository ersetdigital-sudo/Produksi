import { Icon } from "@/components/ui/icons";
import { formatQty } from "@/lib/format";
import type { ColorPairingView } from "../queries";
import styles from "./colors.module.css";

function codeOf(pairing: ColorPairingView): string {
  return (
    pairing.primary?.code ??
    pairing.primary?.name ??
    pairing.backup?.code ??
    pairing.backup?.name ??
    "—"
  );
}

function stockText(pairing: ColorPairingView): string {
  const primary = pairing.primary;
  if (!primary) return "Kode belum diisi";
  return `sisa ${formatQty(primary.stock)} ${primary.unit}`;
}

export function PairingCell({
  pairing,
  variant,
}: {
  pairing: ColorPairingView;
  variant: "table" | "card";
}) {
  if (variant === "table") {
    if (pairing.status === "kosong") {
      return (
        <span className="ph" aria-label="Belum diisi">
          —
        </span>
      );
    }

    if (pairing.status === "aman") {
      return (
        <span className="code" title={`${pairing.slotName} ${codeOf(pairing)}`}>
          {codeOf(pairing)}
        </span>
      );
    }

    if (pairing.status === "menipis") {
      return (
        <span className={`b b-wr ${styles.badge}`}>
          <Icon name="alert-triangle" />
          <span className="code">{codeOf(pairing)}</span>
          <span className={styles.mini}>menipis</span>
        </span>
      );
    }

    if (pairing.status === "cadangan") {
      return (
        <span className={`b b-wr ${styles.badge}`}>
          <Icon name="alert-triangle" />
          <s className="code">{pairing.primary?.code}</s>
          <span aria-hidden="true">→</span>
          <span className="code">{pairing.backup?.code}</span>
        </span>
      );
    }

    return (
      <span className={`b b-no ${styles.badge}`}>
        <Icon name="octagon-x" />
        <span className="code">{codeOf(pairing)}</span>
        <span className={styles.mini}>habis</span>
      </span>
    );
  }

  const statusClass =
    pairing.status === "aman"
      ? styles.pairingOk
      : pairing.status === "kosong"
        ? styles.pairingEmpty
        : pairing.status === "habis"
          ? styles.pairingNo
          : styles.pairingWarn;

  return (
    <div
      className={`${styles.pairingCard} ${statusClass}`}
      title={`${pairing.slotName}: ${stockText(pairing)}`}
    >
      <span className={styles.pairingLabel}>{pairing.slotName}</span>

      {pairing.status === "kosong" ? (
        <span className={styles.pairingCode}>Belum diisi</span>
      ) : pairing.status === "cadangan" ? (
        <span>
          <s className={`code ${styles.strike}`}>{pairing.primary?.code}</s>{" "}
          <span className="code">{pairing.backup?.code}</span>
        </span>
      ) : (
        <span className={`code ${styles.pairingCode}`}>{codeOf(pairing)}</span>
      )}

      {pairing.status === "kosong" ? null : (
        <span className={styles.pairingStatus}>
          <Icon
            name={
              pairing.status === "aman"
                ? "check-circle"
                : pairing.status === "habis"
                  ? "octagon-x"
                  : "alert-triangle"
            }
          />
          {pairing.status === "aman"
            ? "Aman"
            : pairing.status === "habis"
              ? "Habis"
              : pairing.status === "cadangan"
                ? "Pakai cadangan"
                : "Menipis"}
        </span>
      )}
    </div>
  );
}
