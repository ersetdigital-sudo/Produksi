import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/badges";
import { StatCard } from "@/components/ui/primitives";
import { getDashboardData } from "@/features/dashboard/queries";
import { formatQty } from "@/lib/format";
import styles from "@/features/dashboard/components/dashboard.module.css";

export const metadata: Metadata = { title: "Beranda" };

const inKinds = new Set(["in", "purchase_in", "production_return"]);
const outKinds = new Set(["out", "production_out", "assembly_out"]);

function formatTodaySubtitle() {
  const now = new Date();
  const text = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return text.charAt(0).toUpperCase() + text.slice(1) + " · ringkasan stok bahan produksi";
}

function movementKind(kind: string): "in" | "out" | "opname" {
  if (kind === "opname") return "opname";
  return inKinds.has(kind) ? "in" : "out";
}

function movementLabel(kind: "in" | "out" | "opname") {
  return kind === "in" ? "Masuk" : kind === "out" ? "Keluar" : "Opname";
}

function movementIcon(kind: "in" | "out" | "opname") {
  if (kind === "in") return "arrow-down" as const;
  if (kind === "out") return "arrow-up" as const;
  return "doc" as const;
}

function formatMutationWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - thatDay.getTime()) / 86400000);
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  if (diffDays === 0) return time;
  if (diffDays === 1) return `kemarin ${time}`;
  const day = d.getDate();
  const month = d.toLocaleDateString("id-ID", { month: "short" });
  return `${day} ${month} ${time}`;
}

function formatMutationQty(kind: "in" | "out" | "opname", qty: number, unit: string, note: string | null) {
  if (kind === "opname") {
    const match = note?.match(/→\s*([^\s(]+)/);
    if (match?.[1]) return `jadi ${match[1]} ${unit}`;
  }
  const sign = qty > 0 ? "+" : qty < 0 ? "−" : "";
  return `${sign}${formatQty(Math.abs(qty))} ${unit}`;
}

function attentionExplanation(m: {
  status: string;
  stock: number;
  min: number;
  unit: string;
  backup: { code: string; stock: number; unit: string } | null;
  usageColor: { name: string } | null;
}) {
  const color = m.usageColor?.name ? ` · dipakai warna ${m.usageColor.name}` : "";
  if (m.status === "habis") {
    return `Sisa ${formatQty(m.stock)} ${m.unit} · tidak punya cadangan${color}`;
  }
  if (m.status === "cadangan") {
    const b = m.backup;
    return `Kode utama habis · cadangan ${b?.code ?? "—"} tersedia ${formatQty(b?.stock ?? 0)} ${b?.unit ?? m.unit}${color}`;
  }
  return `Sisa ${formatQty(m.stock)} ${m.unit} · minimum ${formatQty(m.min)} ${m.unit}${color}`;
}

function statusUrgency(status: string) {
  if (status === "habis") return 0;
  if (status === "cadangan") return 1;
  if (status === "menipis") return 2;
  return 3;
}

export default async function BerandaPage() {
  const { catalog, recentMovements } = await getDashboardData();
  const allMaterials = catalog.groups.flatMap((g) => g.types.flatMap((t) => t.materials));
  const allTypes = catalog.groups.flatMap((g) => g.types);
  const typesWithMaterials = allTypes.filter((t) => t.materials.length > 0).length;

  const aman = allMaterials.filter((m) => m.status === "aman").length;
  const menipis = allMaterials.filter((m) => m.status === "menipis").length;
  const cadangan = allMaterials.filter((m) => m.status === "cadangan").length;
  const habis = allMaterials.filter((m) => m.status === "habis").length;

  const attention = allMaterials
    .filter((m) => m.status === "habis" || m.status === "cadangan" || m.status === "menipis")
    .sort((a, b) => statusUrgency(a.status) - statusUrgency(b.status));

  return (
    <>
      <PageHeader title="Beranda" subtitle={formatTodaySubtitle()} />

      <div className="g4">
        <StatCard
          label="Total material"
          value={catalog.total}
          sub={`kode di ${typesWithMaterials} jenis material`}
        />
        <StatCard
          label="Aman"
          badge={<StatusBadge status="aman" />}
          value={aman}
          sub="kode utama di atas minimum"
        />
        <StatCard
          label="Pakai cadangan / menipis"
          badge={
            <span className="b b-wr" style={{ alignSelf: "flex-start" }}>
              <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4 2.5 20h19z" />
                <path d="M12 10v4M12 17v.01" />
              </svg>
              Pakai cadangan / menipis
            </span>
          }
          value={menipis + cadangan}
          sub="masih bisa produksi, segera beli"
        />
        <StatCard
          label="Habis"
          badge={<StatusBadge status="habis" />}
          value={habis}
          sub="utama dan cadangan kosong"
        />
      </div>

      <div className={styles.twoCol}>
        <section className="card" aria-labelledby="d1-a">
          <div className="row sp pad" style={{ paddingBottom: 14 }}>
            <div>
              <h2 className="h2" id="d1-a">Perlu perhatian</h2>
              <p className="sub">Diurutkan dari yang paling mendesak</p>
            </div>
            <Link className="btn btn-g btn-sm" href="/material">Lihat semua material</Link>
          </div>
          {attention.length === 0 ? (
            <div className="pad">
              <p className="sub">Semua stok aman</p>
            </div>
          ) : (
            <>
              <div className={styles.desktopAttention}>
                {attention.map((m) => (
                  <div className={`li ${styles.attentionItem}`} key={m.id}>
                    <div className={`grow ${styles.attentionBody}`}>
                      <div className={styles.attentionTitle}>
                        {m.typeName}{" "}
                        {m.code ? <span className="code">{m.code}</span> : m.name ?? null}
                        {m.code && m.name ? <span className="sub"> ({m.name})</span> : null}
                      </div>
                      <div className="sub">{attentionExplanation(m)}</div>
                    </div>
                    <StatusBadge status={m.status} />
                    <Link
                      className={`btn btn-s btn-sm ${styles.attentionAction}`}
                      href={`/mutasi?drawer=masuk&materialId=${m.id}`}
                    >
                      Catat masuk
                    </Link>
                  </div>
                ))}
              </div>
              <div className={styles.mobileAttention}>
                {attention.map((m) => (
                  <div className="card pad col" style={{ gap: 6 }} key={m.id}>
                    <div className="row sp">
                      <b>
                        {m.typeName}{" "}
                        {m.code ? <span className="code">{m.code}</span> : m.name ?? null}
                        {m.code && m.name ? <span className="sub"> ({m.name})</span> : null}
                      </b>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="sub">{attentionExplanation(m)}</p>
                    <Link
                      className="btn btn-s btn-sm"
                      href={`/mutasi?drawer=masuk&materialId=${m.id}`}
                      style={{ alignSelf: "flex-start", marginTop: 4 }}
                    >
                      Catat masuk
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="d1-b">
          <div className="row sp pad" style={{ paddingBottom: 14 }}>
            <h2 className="h2" id="d1-b">Mutasi terakhir</h2>
            <Link className="btn btn-g btn-sm" href="/mutasi">Riwayat</Link>
          </div>
          {recentMovements.length === 0 ? (
            <div className="pad"><p className="sub">Belum ada mutasi</p></div>
          ) : (
            recentMovements.map((mv) => {
              const k = movementKind(mv.kind);
              const subParts = [
                movementLabel(k),
                mv.colorName || null,
                mv.userName || null,
                formatMutationWhen(mv.occurredAt),
              ].filter(Boolean);
              return (
                <div className="li" key={mv.id}>
                  <span className="ico">
                    <Icon name={movementIcon(k)} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>
                      {mv.typeName} {mv.materialCode ? <span className="code">{mv.materialCode}</span> : null}
                    </div>
                    <div className="sub">{subParts.join(" · ")}</div>
                  </div>
                  <b className="num">{formatMutationQty(k, mv.qty, mv.unit, mv.note)}</b>
                </div>
              );
            })
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="d1-c">
        <div className="pad" style={{ paddingBottom: 6 }}>
          <h2 className="h2" id="d1-c">Status per jenis material</h2>
          <p className="sub">Jumlah kode di tiap jenis, dikelompokkan menurut status</p>
        </div>

        <div className={styles.desktopTypeList}>
          {allTypes.map((type, idx) => {
            const total = type.materials.length;
            const a = type.materials.filter((m) => m.status === "aman").length;
            const me = type.materials.filter((m) => m.status === "menipis").length;
            const ca = type.materials.filter((m) => m.status === "cadangan").length;
            const ha = type.materials.filter((m) => m.status === "habis").length;
            const warn = me + ca;
            const parts: string[] = [];
            if (a) parts.push(`${a} aman`);
            if (me) parts.push(`${me} menipis`);
            if (ca) parts.push(`${ca} pakai cadangan`);
            if (ha) parts.push(`${ha} habis`);
            return (
              <div className={`li ${styles.typeRow}`} style={idx === 0 ? { borderTop: 0 } : undefined} key={type.id}>
                <div className={styles.typeName}>{type.name}</div>
                <div className="grow">
                  <div className="bar" aria-hidden="true">
                    {total > 0 && a > 0 ? <i style={{ flex: a, background: "var(--ok)" }} /> : null}
                    {total > 0 && warn > 0 ? <i style={{ flex: warn, background: "var(--wrb)" }} /> : null}
                    {total > 0 && ha > 0 ? <i style={{ flex: ha, background: "var(--no)" }} /> : null}
                  </div>
                </div>
                <div className={`${styles.typeText} sub`}>
                  {total === 0 ? <span className="ph">[belum ada data]</span> : `${total} kode · ${parts.join(" · ")}`}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`pad col ${styles.mobileTypeList}`} style={{ gap: 14 }}>
          {allTypes.map((type, idx) => {
            const total = type.materials.length;
            const a = type.materials.filter((m) => m.status === "aman").length;
            const me = type.materials.filter((m) => m.status === "menipis").length;
            const ca = type.materials.filter((m) => m.status === "cadangan").length;
            const ha = type.materials.filter((m) => m.status === "habis").length;
            const warn = me + ca;
            const parts: string[] = [];
            if (a) parts.push(`${a} aman`);
            if (me) parts.push(`${me} menipis`);
            if (ca) parts.push(`${ca} pakai cadangan`);
            if (ha) parts.push(`${ha} habis`);
            return (
              <div key={type.id}>
                {idx > 0 ? <hr className="hr" style={{ marginBottom: 14 }} /> : null}
                <div className="col" style={{ gap: 6 }}>
                  <div className="row sp">
                    <b>{type.name}</b>
                    {total === 0 ? <span className="ph">[belum ada data]</span> : <span className="sub">{total} kode</span>}
                  </div>
                  <div className="bar" aria-hidden="true">
                    {total > 0 && a > 0 ? <i style={{ flex: a, background: "var(--ok)" }} /> : null}
                    {total > 0 && warn > 0 ? <i style={{ flex: warn, background: "var(--wrb)" }} /> : null}
                    {total > 0 && ha > 0 ? <i style={{ flex: ha, background: "var(--no)" }} /> : null}
                  </div>
                  {total > 0 ? <span className="sub">{parts.join(" · ")}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

