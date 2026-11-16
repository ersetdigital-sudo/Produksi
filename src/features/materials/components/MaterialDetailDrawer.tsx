"use client";

import { Badge, StatusBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/icons";
import { Swatch } from "@/components/ui/primitives";
import { getStockStatus } from "@/features/stock/status";
import { formatQty } from "@/lib/format";
import { materialSatuanText } from "../labels";
import type { MaterialView } from "../queries";
import styles from "./materials.module.css";

export function MaterialDetailDrawer({
  material,
  open,
  onClose,
}: {
  material: MaterialView | null;
  open: boolean;
  onClose: () => void;
}) {
  const title = material
    ? material.code
      ? `${material.typeName} ${material.code}`
      : material.name ?? material.typeName
    : "Detail material";

  const sentence = material
    ? material.primaryForBackup
      ? `${material.typeName} kode ${material.code ?? material.name} disimpan sebagai pengganti untuk kode ${material.primaryForBackup.code} di warna ${material.primaryForBackup.colorName}.`
      : material.usageColor
        ? `${material.typeName} kode ${material.code ?? material.name}${
            material.name ? ` (${material.name})` : ""
          } dipakai untuk menjahit warna ${material.usageColor.name}.`
        : `${material.name ?? material.typeName}${
            material.code ? ` ${material.code}` : ""
          } dipakai untuk ${material.usage}. Jumlah per baju diatur di Bahan per Pcs.`
    : "";

  const backupStatus =
    material?.backup &&
    getStockStatus({
      hasPrimary: true,
      stock: material.backup.stock,
      min: material.backup.min,
    });

  return (
    <Drawer
      open={open && Boolean(material)}
      onClose={onClose}
      title={title}
      eyebrow="Detail material"
      bodyClassName={styles.bodyFlush}
    >
      {material ? (
        <>
          <div className={styles.detailBlock}>
            <p style={{ color: "var(--ink2)" }}>{sentence}</p>
            <div className="row sp" style={{ alignItems: "flex-end" }}>
              <div>
                <div className={styles.detailNumber}>
                  {formatQty(material.stock)}
                  <span>{material.unit} tersisa</span>
                </div>
                <p className="sub" style={{ marginTop: 4 }}>
                  Batas minimum {formatQty(material.min)} {material.unit}
                </p>
              </div>
              <StatusBadge status={material.status} />
            </div>

            {material.detailNote ? (
              <div
                className={
                  material.status === "habis"
                    ? "note note-no"
                    : "note note-wr"
                }
              >
                <Icon
                  name={
                    material.status === "habis"
                      ? "octagon-x"
                      : "alert-triangle"
                  }
                />
                <div>{material.detailNote}</div>
              </div>
            ) : null}

            <div className={styles.detailActions}>
              <ButtonLink
                href={`/mutasi?material=${material.id}&panel=masuk`}
                variant="primary"
                icon="arrow-down"
              >
                Catat masuk
              </ButtonLink>
              <ButtonLink
                href={`/mutasi?material=${material.id}&panel=opname`}
                variant="secondary"
              >
                Opname
              </ButtonLink>
            </div>
          </div>

          <div className={styles.detailBlock}>
            <div>
              <h3 className="h3">Dipakai untuk</h3>
              <p className="sub">{material.usageSub}</p>
            </div>
            <div className={styles.usageBox}>
              {material.usageColor ? (
                <Swatch
                  color={material.usageColor.hex}
                  size={40}
                  radius={6}
                  label={`Foto kain ${material.usageColor.name}`}
                />
              ) : (
                <span className="ico">
                  <Icon
                    name={
                      material.group === "aksesoris"
                        ? "ring"
                        : material.group === "kain_keras"
                          ? "flask"
                          : "box"
                    }
                  />
                </span>
              )}
              <div className="grow">
                <b>{material.usageColor?.name ?? material.usage}</b>
                <div className="sub">
                  {material.usageColor
                    ? material.usageColor.code
                    : material.usageSub}
                </div>
              </div>
              <Badge tone="neutral">{material.role}</Badge>
            </div>
          </div>

          <div className={styles.detailBlock}>
            <h3 className="h3">Kalau kode ini habis</h3>
            {material.backup ? (
              <>
                <p className="sub">
                  Otomatis diganti dengan kode ini saat Lea mencatat barang
                  keluar:
                </p>
                <div className={styles.usageBox}>
                  <div className="grow">
                    <b className="code" style={{ fontSize: 15 }}>
                      {material.backup.code}
                    </b>
                    <div className="sub">
                      Sisa {formatQty(material.backup.stock)}{" "}
                      {material.backup.unit}
                    </div>
                  </div>
                  {backupStatus ? <StatusBadge status={backupStatus} /> : null}
                </div>
              </>
            ) : material.primaryForBackup ? (
              <p className="sub">
                Kode ini sendiri adalah pengganti untuk{" "}
                <b className="code" style={{ color: "var(--ink)" }}>
                  {material.primaryForBackup.code}
                </b>
                , jadi dipakai saat {material.primaryForBackup.code} habis.
              </p>
            ) : (
              <p className="sub">
                Belum ada kode pengganti. Kalau habis, produksi yang butuh kode
                ini tertahan. Pengganti bisa diatur di Katalog Warna.
              </p>
            )}
          </div>

          <div className={styles.detailBlock}>
            <p className="sub">
              {materialSatuanText(material.unit, material.group)}
            </p>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
