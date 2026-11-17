"use client";

import { Button, ButtonLink } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/badges";
import { formatQty } from "@/lib/format";
import type { ColorPairingView, ColorView } from "../queries";
import { ColorThumb } from "./ColorThumb";
import styles from "./colors.module.css";

function materialLabel(
  code: string | null | undefined,
  name: string | null | undefined,
): string {
  if (code && name) return `${code} (${name})`;
  return code ?? name ?? "—";
}

function pairingDescription(pairing: ColorPairingView): string {
  if (pairing.status === "kosong") return "Kode belum diisi";
  const primary = pairing.primary;
  if (!primary) return "Kode belum diisi";

  const stock = `sisa ${formatQty(primary.stock)} ${primary.unit}`;

  if (pairing.status === "cadangan" && pairing.backup) {
    return `Utama ${primary.code ?? primary.name} habis · cadangan ${materialLabel(
      pairing.backup.code,
      pairing.backup.name,
    )} sisa ${formatQty(pairing.backup.stock)} ${pairing.backup.unit}`;
  }

  if (pairing.status === "menipis") {
    return `Utama ${materialLabel(primary.code, primary.name)} · ${stock}, di bawah minimum ${formatQty(primary.min)} ${primary.unit}`;
  }

  if (pairing.status === "habis") {
    return `Utama ${materialLabel(primary.code, primary.name)} · ${stock}${
      pairing.backup ? " · cadangan juga habis" : " · tanpa cadangan"
    }`;
  }

  return `Utama ${materialLabel(primary.code, primary.name)} · ${stock}`;
}

export function ColorDetailDrawer({
  color,
  open,
  onClose,
  onEdit,
}: {
  color: ColorView | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Drawer
      open={open && Boolean(color)}
      onClose={onClose}
      title={color?.name ?? "Detail warna"}
      eyebrow={color ? `${color.fabricCode} · ${color.colorCode}` : undefined}
      leading={
        color ? (
          <ColorThumb
            hex={color.hex}
            photoUrl={color.photoUrl}
            name={color.name}
            size={44}
            radius={8}
          />
        ) : null
      }
      bodyClassName={styles.bodyFlush}
    >
      {color ? (
        <>
          <div className={styles.detailBlock}>
            <div>
              <div className="kv" style={{ borderTop: 0 }}>
                <span className="sub">Jenis Kain</span>
                <span className="code">{color.fabricCode}</span>
              </div>
              <div className="kv">
                <span className="sub">Kode Warna Kain</span>
                <span className="code">{color.colorCode}</span>
              </div>
              <div className="kv">
                <span className="sub">Jenis Produk</span>
                <span>
                  {color.products.length > 0
                    ? color.products.map((product) => product.name).join(", ")
                    : "—"}
                </span>
              </div>
            </div>
            <div className={styles.detailActions}>
              <ButtonLink
                href={`/mutasi?warna=${color.id}`}
                variant="primary"
                icon="arrow-up"
              >
                Catat barang keluar
              </ButtonLink>
              <Button variant="secondary" onClick={onEdit}>
                Ubah pasangan
              </Button>
            </div>
          </div>

          <div className={styles.detailBlock}>
            <h3 className="h3">Pasangan untuk warna ini</h3>
            <div>
              {color.pairings.map((pairing) => (
                <div className={styles.detailPair} key={pairing.slotId}>
                  <div>
                    <div className={styles.detailPairName}>{pairing.slotName}</div>
                    <div className="sub">{pairingDescription(pairing)}</div>
                  </div>
                  <div>
                    <StatusBadge status={pairing.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
