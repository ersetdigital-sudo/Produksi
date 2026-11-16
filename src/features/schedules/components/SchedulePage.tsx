"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import { Drawer } from "@/components/ui/Drawer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, Note, Swatch } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/Tabs";
import { PlanStatusBadge } from "@/components/ui/badges";
import { formatQty, formatDateId } from "@/lib/format";
import {
  advancePlan,
  receivePlanResult,
  saveLineCheckbox,
  saveTailor,
} from "../actions";
import type { PlanDetail, PlanListItem, ScheduleData } from "../queries";
import styles from "./schedule.module.css";

const statusTabs = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draft" },
  { value: "reserved", label: "Dicadangkan" },
  { value: "running", label: "Berjalan" },
  { value: "done", label: "Selesai" },
  { value: "cancelled", label: "Batal" },
] as const;

type Tab = (typeof statusTabs)[number]["value"];
type InnerTab = "potong" | "bahan" | "hasil";

function statusLabel(value: string): string {
  return statusTabs.find((t) => t.value === value)?.label ?? value;
}

function PrintPreview({
  plan,
  onClose,
}: {
  plan: PlanDetail;
  onClose: () => void;
}) {
  const groups = groupedStatic(plan);
  return (
    <div className={styles.printOverlay} role="dialog" aria-modal="true" aria-label="Pratinjau lembar potong">
      <div className={styles.printBar}>
        <span className={styles.printBarTitle}>Pratinjau lembar potong</span>
        <Button variant="secondary" onClick={onClose}>Tutup</Button>
        <Button variant="primary" onClick={() => window.print()}>
          <Icon name="printer" size={16} /> Cetak
        </Button>
      </div>
      <article className={styles.paper} aria-label={`Lembar potong ${plan.plan.poNumber}`}>
        <div className={styles.paperHead}>
          <div>
            <div className={styles.paperBrand}>SAMAQU</div>
            <h1 className={styles.paperTitle}>LEMBAR POTONG</h1>
            {plan.plan.note ? <div className={styles.paperNote}>{plan.plan.note}</div> : null}
          </div>
          <div className={styles.paperMeta}>
            <b>{plan.plan.poNumber}</b><br />
            Tanggal: {formatDateId(plan.plan.planDate)}<br />
            Total: <b>{plan.lines.reduce((n, l) => n + l.qty, 0)} pcs</b> · {plan.lines.length} baris
          </div>
        </div>
        {groups.map(([size, lines]) => (
          <section className={styles.paperGroup} key={size}>
            <div className={styles.paperGroupHead}>
              <span>{lines[0]?.productName} · SIZE {size}</span>
              <span>{lines.reduce((n, l) => n + l.qty, 0)} pcs</span>
            </div>
            <div className={`${styles.paperRow} ${styles.paperRowHead}`}>
              <span>Warna (kain)</span><span>Series</span><span className={styles.right}>Jumlah</span><span className={styles.center}>Potong</span><span>Penjahit</span><span className={styles.center}>Selesai</span>
            </div>
            {lines.map((l) => (
              <div className={styles.paperRow} key={l.id}>
                <span>{l.colorName} ({l.fabricCode})</span>
                <span>{l.seriesName ?? "Tanpa series"}</span>
                <span className={styles.right}>{l.qty}</span>
                <span className={styles.center}><i className={styles.box} /></span>
                <span>{l.tailorName ?? ""}</span>
                <span className={styles.center}><i className={styles.box} /></span>
              </div>
            ))}
          </section>
        ))}
        <div className={styles.paperTotal}><span>TOTAL</span><b>{plan.lines.reduce((n, l) => n + l.qty, 0)} pcs</b></div>
        <div className={styles.paperSign}><div>Dibuat oleh</div><div>Diterima bagian potong</div><div>Diperiksa</div></div>
      </article>
    </div>
  );
}

function groupedStatic(plan: PlanDetail) {
  const map = new Map<string, typeof plan.lines>();
  for (const line of plan.lines) {
    const list = map.get(line.size) ?? [];
    list.push(line);
    map.set(line.size, list);
  }
  return Array.from(map.entries());
}

export function SchedulePage({ data }: { data: ScheduleData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [inner, setInner] = useState<InnerTab>("potong");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [locals, setLocals] = useState<Record<string, Record<string, string>>>({});
  const [tailor, setTailor] = useState<Record<string, string>>({});

  const selected = data.plans.find((p) => p.plan.id === selectedId) ?? null;

  const filtered = useMemo(
    () =>
      tab === "all"
        ? data.lists
        : data.lists.filter((l) => l.plan.status === tab),
    [data.lists, tab],
  );

  const tabItems = statusTabs.map((t) => ({
    value: t.value,
    label: t.label,
    count:
      t.value === "all"
        ? data.lists.length
        : data.lists.filter((l) => l.plan.status === t.value).length,
  }));

  const template = "100px 104px minmax(0,1fr) 118px 76px 140px 150px 128px 32px";

  async function run(action: Promise<{ ok: boolean; error?: string }>, key: string) {
    setSaving((s) => ({ ...s, [key]: true }));
    setError(null);
    const res = await action;
    setSaving((s) => ({ ...s, [key]: false }));
    if (!res.ok) setError(res.error ?? "Terjadi kesalahan.");
    else router.refresh();
  }

  const toggleCheck = (
    plan: PlanDetail,
    lineId: string,
    field: "cutDone" | "lineDone" | "sewingPaid",
    value: boolean,
  ) => {
    void run(
      saveLineCheckbox({ planId: plan.plan.id, lineId, field, value }),
      `${plan.plan.id}-${lineId}-${field}`,
    );
  };

  const setTailorValue = (plan: PlanDetail, lineId: string, name: string) => {
    void run(saveTailor({ planId: plan.plan.id, lineId, tailorName: name }), `${lineId}-tailor`);
  };

  const close = () => {
    setSelectedId(null);
    setInner("potong");
  };

  const groupedBySize = (plan: PlanDetail) => {
    const map = new Map<string, typeof plan.lines>();
    for (const line of plan.lines) {
      const key = line.size;
      const list = map.get(key) ?? [];
      list.push(line);
      map.set(key, list);
    }
    return Array.from(map.entries());
  };

  const resultsByLine = useMemo(() => {
    const map = new Map<string, { pass: number; defect: number }>();
    for (const plan of data.plans) {
      for (const r of plan.results) {
        const cur = map.get(r.planLineId) ?? { pass: 0, defect: 0 };
        cur.pass += r.passQty;
        cur.defect += r.defectQty;
        map.set(r.planLineId, cur);
      }
    }
    return map;
  }, [data.plans]);

  const statusTones: Record<string, string> = {
    draft: "b b-nt",
    reserved: "b b-jd",
    running: "b b-run",
    done: "b b-ok",
    cancelled: "b b-nt",
  };

  return (
    <>
      <PageHeader
        title="Jadwal Produksi"
        subtitle="Satu jadwal = satu PO. Klik PO untuk lihat lembar potong per size dan kebutuhan bahannya."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setSelectedId(null)}>
            Buat jadwal
          </Button>
        }
      />

      <div className={`${styles.sheet} ${styles.gridList}`}>
        <Tabs
          items={tabItems}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          ariaLabel="Status jadwal"
        />
        <div className={styles.gridHead} style={{ gridTemplateColumns: template }}>
          <span>No. PO</span>
          <span>Tanggal</span>
          <span>Produk</span>
          <span>Varian</span>
          <span className={styles.right}>Total</span>
          <span>Sudah dipotong</span>
          <span>Bahan</span>
          <span>Status</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <b>Belum ada jadwal</b>
            <span className="sub" style={{ display: "block" }}>
              Buat jadwal untuk mulai memesan produksi.
            </span>
          </div>
        ) : (
          filtered.map((item) => {
            const isActive = item.plan.status === "draft" || item.plan.status === "reserved";
            return (
              <button
                key={item.plan.id}
                type="button"
                className={styles.gridRow}
                style={{ gridTemplateColumns: template }}
                onClick={() => setSelectedId(item.plan.id)}
              >
                <span>
                  <b>{item.plan.poNumber}</b>
                </span>
                <span className="num">
                  {formatDateId(item.plan.planDate)}
                </span>
                <span>{item.productNames.join(", ")}</span>
                <span className="sub">
                  {item.lineCount} baris · {item.sizeCount} size
                </span>
                <span className={`${styles.right} num`}>
                  <b>{item.totalQty}</b>{" "}
                  <span className="sub">pcs</span>
                </span>
                <span>
                  <span className={`pg ${styles.progress}`}>
                    <i>
                      <b
                        style={{
                          width: `${(item.cutDone / Math.max(1, item.lineCount)) * 100}%`,
                        }}
                      />
                    </i>
                    {item.cutDone}/{item.lineCount} baris
                  </span>
                </span>
                <span>
                  {isActive ? (
                    <span className="b b-nt">Cukup</span>
                  ) : (
                    <span className="b b-nt">—</span>
                  )}
                </span>
                <span>
                  <span className={statusTones[item.plan.status]}>
                    {statusLabel(item.plan.status)}
                  </span>
                </span>
                <span>
                  <Icon name="chevron-right" size={16} />
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Mobile list */}
      <div className={`card ${styles.mobileList}`}>
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada jadwal"
            description="Buat jadwal untuk mulai memesan produksi."
          />
        ) : (
          filtered.map((item) => (
            <button
              key={item.plan.id}
              type="button"
              className={styles.mobileCard}
              onClick={() => setSelectedId(item.plan.id)}
            >
              <span className="row sp" style={{ width: "100%" }}>
                <b style={{ fontSize: 16 }}>{item.plan.poNumber}</b>
                <span className={statusTones[item.plan.status]}>
                  {statusLabel(item.plan.status)}
                </span>
              </span>
              <span className="sub">
                {formatDateId(item.plan.planDate)} ·{" "}
                {item.productNames.join(", ")} ·{" "}
                <b style={{ color: "var(--ink)" }}>{item.totalQty} pcs</b> ·{" "}
                {item.sizeCount} size
              </span>
              <span className={`pg ${styles.progress}`}>
                <i>
                  <b style={{ width: `${(item.cutDone / Math.max(1, item.lineCount)) * 100}%` }} />
                </i>
                Dipotong {item.cutDone}/{item.lineCount}
              </span>
            </button>
          ))
        )}
      </div>

      {selected ? (
        <PlanDetailDrawer
          plan={selected}
          onClose={close}
          error={error}
          saving={saving}
          onAdvance={(to) =>
            run(advancePlan({ planId: selected.plan.id, to }), `adv-${to}`)
          }
          onToggleCheck={toggleCheck}
          onTailor={(lineId, name) => setTailorValue(selected, lineId, name)}
          onReceive={(planLineId, vals) =>
            run(
              receivePlanResult({ planId: selected.plan.id, planLineId, ...vals }),
              `recv-${planLineId}`,
            )
          }
          resultsByLine={resultsByLine}
          groupedBySize={groupedBySize}
          innerTab={inner}
          setInnerTab={setInner}
          locals={locals}
          setLocals={setLocals}
          tails={tailor}
          setTail={setTailor}
          router={router}
        />
      ) : null}

      <p className="sub">
        PO contoh diambil dari sheet produksi. Penjahit, PO, dan ukuran bisa
        ditambah lewat Buat jadwal.
      </p>
    </>
  );
}

function PlanDetailDrawer({
  plan,
  onClose,
  error,
  saving,
  onAdvance,
  onToggleCheck,
  onTailor,
  onReceive,
  resultsByLine,
  groupedBySize,
  innerTab,
  setInnerTab,
  locals,
  setLocals,
  tails,
  setTail,
  router,
}: {
  plan: PlanDetail;
  onClose: () => void;
  error: string | null;
  saving: Record<string, boolean>;
  onAdvance: (to: string) => void;
  onToggleCheck: (
    plan: PlanDetail,
    lineId: string,
    field: "cutDone" | "lineDone" | "sewingPaid",
    value: boolean,
  ) => void;
  onTailor: (lineId: string, name: string) => void;
  onReceive: (
    planLineId: string,
    vals: {
      pass: number;
      defect: number;
      defectReason?: string;
      defectAction?: "repair" | "reject";
    },
  ) => void;
  resultsByLine: Map<string, { pass: number; defect: number }>;
  groupedBySize: (plan: PlanDetail) => [string, PlanDetail["lines"]][];
  innerTab: InnerTab;
  setInnerTab: (t: InnerTab) => void;
  locals: Record<string, Record<string, string>>;
  setLocals: Dispatch<SetStateAction<Record<string, Record<string, string>>>>;
  tails: Record<string, string>;
  setTail: Dispatch<SetStateAction<Record<string, string>>>;
  router: ReturnType<typeof useRouter>;
}) {
  const [printOpen, setPrintOpen] = useState(false);
  const [saveState, setSaveState] = useState<
    Record<string, "saving" | "saved" | "error">
  >({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveMsgTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const localsRef = useRef(locals);
  const resultsRef = useRef(resultsByLine);

  useEffect(() => {
    localsRef.current = locals;
  }, [locals]);

  useEffect(() => {
    resultsRef.current = resultsByLine;
  }, [resultsByLine]);

  useEffect(() => {
    return () => {
      for (const t of Object.values(saveTimers.current)) clearTimeout(t);
      for (const t of Object.values(saveMsgTimers.current)) clearTimeout(t);
    };
  }, []);

  const saveLabel: Record<string, string> = {
    draft: "Setujui dan cadangkan bahan",
    reserved: "Mulai produksi",
    running: "Tandai selesai",
    done: "",
    cancelled: "",
  };
  const primaryAction = saveLabel[plan.plan.status];

  const scheduleSave = (lineId: string, nextLocals?: Record<string, string>) => {
    if (saveTimers.current[lineId]) clearTimeout(saveTimers.current[lineId]);
    saveTimers.current[lineId] = setTimeout(async () => {
      const l = nextLocals ?? localsRef.current[lineId] ?? {};
      const res = resultsRef.current.get(lineId) ?? { pass: 0, defect: 0 };
      const pass = Number(l.pass ?? res.pass);
      const defect = Number(l.defect ?? res.defect);
      setSaveState((s) => ({ ...s, [lineId]: "saving" }));
      const out = await receivePlanResult({
        planId: plan.plan.id,
        planLineId: lineId,
        pass,
        defect,
        defectReason: defect > 0 ? (l.reason ?? "") : undefined,
        defectAction:
          defect > 0
            ? ((l.action as "repair" | "reject") || "repair")
            : undefined,
      });
      setSaveState((s) => ({ ...s, [lineId]: out.ok ? "saved" : "error" }));
      if (out.ok) {
        setLocals((prev) => {
          const copy = { ...prev };
          delete copy[lineId];
          return copy;
        });
        router.refresh();
      }
      if (saveMsgTimers.current[lineId]) clearTimeout(saveMsgTimers.current[lineId]);
      saveMsgTimers.current[lineId] = setTimeout(() => {
        setSaveState((s) => {
          if (s[lineId] === "saving") return s;
          const { [lineId]: _, ...rest } = s;
          return rest;
        });
      }, 1800);
    }, 600);
  };

  const totalTarget = plan.lines.reduce((n, l) => n + l.qty, 0);
  const totalDoneQty = plan.lines.reduce(
    (n, l) => n + (l.lineDone ? l.qty : 0),
    0,
  );
  const cutDoneCount = plan.lines.filter((l) => l.cutDone).length;
  const totalPass = plan.lines.reduce(
    (n, l) => n + (resultsByLine.get(l.id)?.pass ?? 0),
    0,
  );
  const totalDefect = plan.lines.reduce(
    (n, l) => n + (resultsByLine.get(l.id)?.defect ?? 0),
    0,
  );
  const selisih = plan.lines.reduce((n, l) => {
    const r = resultsByLine.get(l.id) ?? { pass: 0, defect: 0 };
    const used = r.pass + r.defect;
    return n + Math.max(0, l.qty - used);
  }, 0);

  const statusTone = {
    draft: "b b-nt",
    reserved: "b b-jd",
    running: "b b-run",
    done: "b b-ok",
    cancelled: "b b-nt",
  }[plan.plan.status];

  return (
    <Drawer
      open
      onClose={onClose}
      variant="xl"
      eyebrow="Jadwal produksi"
      title={`${plan.plan.poNumber} · ${plan.lines.reduce((n, l) => n + l.qty, 0)} pcs ${Array.from(new Set(plan.lines.map((l) => l.productName))).join(", ")}`}
      titleAside={
        <span className={statusTone}>
          {statusLabel(plan.plan.status)}
        </span>
      }
      headerAside={
        <div className="seg" role="group" aria-label="Isi jadwal">
          <button
            type="button"
            className={innerTab === "potong" ? "on" : ""}
            onClick={() => setInnerTab("potong")}
          >
            Lembar potong
          </button>
          <button
            type="button"
            className={innerTab === "bahan" ? "on" : ""}
            onClick={() => setInnerTab("bahan")}
          >
            Bahan
          </button>
          <button
            type="button"
            className={innerTab === "hasil" ? "on" : ""}
            onClick={() => setInnerTab("hasil")}
          >
            Terima hasil
          </button>
        </div>
      }
      bodyClassName={styles.bodyFlush}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setPrintOpen(true)}
            aria-label="Cetak lembar potong"
          >
            <span className="ib" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z" /></svg>
            </span>
            Cetak lembar potong
          </Button>
          {primaryAction ? (
            <Button
              variant="primary"
              disabled={saving[`adv-${plan.plan.status}`]}
              onClick={() =>
                plan.plan.status === "draft"
                  ? onAdvance("reserved")
                  : plan.plan.status === "reserved"
                    ? onAdvance("running")
                    : plan.plan.status === "running"
                      ? onAdvance("done")
                      : undefined
              }
            >
              {saving[`adv-${plan.plan.status}`] ? "Memproses…" : primaryAction}
            </Button>
          ) : null}
        </>
      }
    >
      {error ? <Note tone="danger">{error}</Note> : null}

      {innerTab === "potong" ? (
        <div className="col pad" style={{ gap: 12, paddingTop: 12 }}>
          <div className={styles.poBar}>
            <b>
              {plan.plan.poNumber} · {formatDateId(plan.plan.planDate)}
            </b>
            {plan.plan.note ? <span>{plan.plan.note}</span> : null}
          </div>
          <div className={styles.progressRow}>
            <div className="col" style={{ gap: 6 }}>
              <span className="lbl">Sudah dipotong</span>
              <span className={styles.pg}>
                <span className={styles.pgBar}>
                  <span
                    className={styles.pgBarFill}
                    style={{
                      width: `${plan.lines.length > 0 ? (cutDoneCount / plan.lines.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                {cutDoneCount}/{plan.lines.length} baris
              </span>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <span className="lbl">Sudah selesai</span>
              <span className={styles.pg}>
                <span className={styles.pgBar}>
                  <span
                    className={styles.pgBarFill}
                    style={{
                      width: `${totalTarget > 0 ? (totalDoneQty / totalTarget) * 100 : 0}%`,
                    }}
                  />
                </span>
                {totalDoneQty}/{totalTarget} pcs
              </span>
            </div>
          </div>
          {groupedBySize(plan).map(([size, lines]) => (
            <section className={styles.sizeSection} key={size}>
              <div className={styles.sizeHead}>
                <span className={styles.sizeTag}>{size}</span>
                <b>{lines[0]?.productName}</b>
                <span className="sub">
                  {lines.length} baris · {lines.reduce((n, l) => n + l.qty, 0)} pcs
                </span>
              </div>
              <div className={styles.cutRowHead} aria-hidden="true">
                <span>Warna</span>
                <span>Series</span>
                <span className={styles.r}>Jumlah</span>
                <span className={styles.c}>Sudah potong</span>
                <span>Penjahit</span>
                <span className={styles.c}>Dibayar jahit</span>
                <span className={styles.c}>Selesai</span>
              </div>
              {lines.map((line) => {
                const res = resultsByLine.get(line.id);
                return (
                  <div
                    className={`${styles.cutRow}${line.lineDone ? ` ${styles.cutRowDone}` : ""}`}
                    key={line.id}
                  >
                    <span title={`${line.colorName} (${line.fabricCode})`}>
                      <Swatch color={line.colorHex} size={14} label={line.colorName} />
                      {line.colorName}
                      <span className="sub"> ({line.fabricCode})</span>
                    </span>
                    <span>{line.seriesName}</span>
                    <span className={`r num`}>
                      <b>{line.qty}</b>
                    </span>
                    <span className="c">
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={line.cutDone}
                        disabled={plan.plan.status === "done"}
                        onChange={(e) =>
                          onToggleCheck(plan, line.id, "cutDone", e.target.checked)
                        }
                        aria-label={`Sudah potong ${line.colorName} ${line.seriesName} size ${line.size}`}
                      />
                    </span>
                    <span>
                      <select
                        className={styles.selectSm}
                        value={tails[line.id] ?? line.tailorName ?? ""}
                        onChange={(e) => {
                          setTail({ ...tails, [line.id]: e.target.value });
                          onTailor(line.id, e.target.value);
                        }}
                        aria-label={`Penjahit ${line.colorName} ${line.seriesName} size ${line.size}`}
                      >
                        <option value="">Pilih</option>
                        <option>Penjahit 1</option>
                        <option>Penjahit 2</option>
                        <option>Penjahit 3</option>
                      </select>
                    </span>
                    <span className="c">
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={line.sewingPaid}
                        disabled={plan.plan.status === "done"}
                        onChange={(e) =>
                          onToggleCheck(plan, line.id, "sewingPaid", e.target.checked)
                        }
                        aria-label={`Sudah dibayar jahit ${line.colorName} ${line.seriesName} size ${line.size}`}
                      />
                    </span>
                    <span className="c">
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={line.lineDone}
                        onChange={(e) =>
                          onToggleCheck(plan, line.id, "lineDone", e.target.checked)
                        }
                        aria-label={`Selesai ${line.colorName} ${line.seriesName} size ${line.size}`}
                      />
                    </span>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      ) : null}

      {innerTab === "bahan" ? (
        <div className="col pad" style={{ gap: 12, paddingTop: 12 }}>
          <Note tone="info">
            Jumlah tiap baris × Bahan per Pcs produknya, digabung per kode dari
            Katalog Warna.
          </Note>
          <div>
            <h3 className="h3">Bahan yang dibutuhkan</h3>
            <p className="sub">
              Jumlah tiap baris × Bahan per Pcs produknya, digabung per kode dari
              Katalog Warna.
            </p>
          </div>
          <div className={styles.kbWrap}>
            <div
              className={styles.kbHead}
              style={{ gridTemplateColumns: "minmax(0,1fr) 60px minmax(0,1.1fr) 84px 84px minmax(0,1.5fr)" }}
            >
              <span>Bahan</span>
              <span>Kode</span>
              <span>Untuk warna</span>
              <span>Butuh</span>
              <span>Stok</span>
              <span>Keterangan</span>
            </div>
            {plan.requirements.map((req) => (
              <div
                className={styles.kbRow}
                style={{ gridTemplateColumns: "minmax(0,1fr) 60px minmax(0,1.1fr) 84px 84px minmax(0,1.5fr)" }}
                key={req.materialId}
              >
                <span style={{ fontWeight: 600 }}>{req.name ?? req.code}</span>
                <span className="code">{req.code ?? "—"}</span>
                <span className="sub">{req.colors.join(", ") || "—"}</span>
                <span className="num">
                  {formatQty(req.requiredQty)} {req.unit}
                </span>
                <span className="num" style={{ color: "var(--ink2)" }}>
                  {formatQty(req.stock)}
                </span>
                <span>
                  {req.status === "cukup" ? (
                    <span className="b b-ok">Cukup</span>
                  ) : req.status === "kurang" ? (
                    <span className="b b-no">Kurang</span>
                  ) : req.status === "cadangan" ? (
                    <span className="b b-wr">Pakai cadangan</span>
                  ) : (
                    <span className="sub">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {innerTab === "hasil" ? (
        <div className="col pad" style={{ gap: 12 }}>
          <Note tone="info">
            Setiap baris harus cocok: lolos + defect = jumlah di jadwal. Boleh
            diisi bertahap. Hanya yang lolos yang masuk rak barang jadi.
          </Note>

          {selisih > 0 ? (
            <Note tone="danger">
              Belum bisa ditandai selesai. Masih ada selisih {selisih} pcs. Isi
              hasil yang belum diterima dulu.
            </Note>
          ) : null}

          <div className={styles.resultCards}>
            <div className={styles.resultCard}>
              <span className="lbl">Target</span>
              <b className="num">{totalTarget}</b>
            </div>
            <div className={styles.resultCard}>
              <span className="lbl">Lolos, masuk rak</span>
              <b className="num" style={{ color: "var(--ok)" }}>
                {totalPass}
              </b>
            </div>
            <div className={styles.resultCard}>
              <span className="lbl">Defect</span>
              <b className="num" style={{ color: "var(--no)" }}>
                {totalDefect}
              </b>
            </div>
            <div className={styles.resultCard}>
              <span className="lbl">Belum diterima</span>
              <b className="num">{selisih}</b>
            </div>
          </div>

          {groupedBySize(plan).map(([size, lines]) => (
            <section className={styles.sizeSection} key={size}>
              <div className={styles.sizeHead}>
                <span className={styles.sizeTag}>{size}</span>
                <b>{lines[0]?.productName}</b>
                <span className="sub">
                  {lines.reduce((n, l) => n + l.qty, 0)} pcs
                </span>
              </div>
              <div className={styles.hsHead} aria-hidden="true">
                <span>Warna</span>
                <span>Series</span>
                <span className={styles.r}>Target</span>
                <span>Lolos</span>
                <span>Defect</span>
                <span className={styles.r}>Belum</span>
                <span>Status</span>
              </div>
              {lines.map((line) => {
                const res = resultsByLine.get(line.id) ?? { pass: 0, defect: 0 };
                const l = locals[line.id] ?? {};
                const passVal = Number(l.pass ?? res.pass);
                const defectVal = Number(l.defect ?? res.defect);
                const belum = Math.max(0, line.qty - passVal - defectVal);
                const totalEntered = passVal + defectVal;
                const statusEl =
                  totalEntered === 0 ? (
                    <span className="sub">—</span>
                  ) : totalEntered === line.qty ? (
                    <span className="b b-ok">
                      <Icon name="check-circle" />
                      Cocok
                    </span>
                  ) : totalEntered < line.qty ? (
                    <span className="b b-wr">
                      <Icon name="alert-triangle" />
                      Kurang {line.qty - totalEntered}
                    </span>
                  ) : (
                    <span className="b b-no">
                      <Icon name="octagon-x" />
                      Lebih {totalEntered - line.qty}
                    </span>
                  );
                const st = saveState[line.id];
                const commit = (next: Record<string, string>) => {
                  setLocals((prev) => ({ ...prev, [line.id]: next }));
                  scheduleSave(line.id, next);
                };
                return (
                  <div className={styles.hsRowWrap} key={line.id}>
                    <div className={styles.hsRow}>
                      <span title={`${line.colorName} (${line.fabricCode})`}>
                        <Swatch color={line.colorHex} size={14} label={line.colorName} />
                        {line.colorName}
                        <span className="sub"> ({line.fabricCode})</span>
                      </span>
                      <span>{line.seriesName}</span>
                      <span className={`${styles.r} num`}>
                        <b>{line.qty}</b>
                      </span>
                      <span>
                        <input
                          className={styles.hin}
                          inputMode="numeric"
                          value={l.pass ?? String(res.pass)}
                          onChange={(e) =>
                            setLocals((prev) => ({
                              ...prev,
                              [line.id]: {
                                ...(prev[line.id] ?? {}),
                                pass: e.target.value.replace(/\D/g, ""),
                              },
                            }))
                          }
                          onBlur={(e) =>
                            scheduleSave(line.id, {
                              ...(localsRef.current[line.id] ?? {}),
                              pass: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          aria-label={`Lolos ${line.colorName} ${line.seriesName} size ${line.size}`}
                        />
                      </span>
                      <span>
                        <input
                          className={styles.hin}
                          inputMode="numeric"
                          value={l.defect ?? String(res.defect)}
                          onChange={(e) => {
                            const defect = e.target.value.replace(/\D/g, "");
                            setLocals((prev) => ({
                              ...prev,
                              [line.id]: {
                                ...(prev[line.id] ?? {}),
                                defect,
                                action: prev[line.id]?.action ?? "repair",
                              },
                            }));
                          }}
                          onBlur={(e) =>
                            scheduleSave(line.id, {
                              ...(localsRef.current[line.id] ?? {}),
                              defect: e.target.value.replace(/\D/g, ""),
                              action: localsRef.current[line.id]?.action ?? "repair",
                            })
                          }
                          aria-label={`Defect ${line.colorName} ${line.seriesName} size ${line.size}`}
                        />
                      </span>
                      <span className={`${styles.r} num`}>{belum}</span>
                      <span>
                        {statusEl}
                        {st ? (
                          <span
                            className={`${styles.saveState} ${
                              st === "saved"
                                ? styles.saveStateOk
                                : st === "error"
                                  ? styles.saveStateErr
                                  : ""
                            }`}
                          >
                            {st === "saving" ? "Menyimpan…" : st === "saved" ? "Tersimpan" : "Gagal simpan"}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {defectVal > 0 ? (
                      <div className={styles.hal}>
                        <span className="sub" style={{ whiteSpace: "nowrap" }}>
                          Alasan defect
                        </span>
                        <input
                          className={`in ${styles.halInput}`}
                          placeholder="Alasan defect"
                          value={l.reason ?? ""}
                          onChange={(e) =>
                            setLocals((prev) => ({
                              ...prev,
                              [line.id]: {
                                ...(prev[line.id] ?? {}),
                                reason: e.target.value,
                              },
                            }))
                          }
                          onBlur={(e) =>
                            scheduleSave(line.id, {
                              ...(localsRef.current[line.id] ?? {}),
                              reason: e.target.value,
                            })
                          }
                          aria-label={`Alasan defect ${line.colorName} ${line.seriesName} size ${line.size}`}
                        />
                        <select
                          className={`in ${styles.halSelect}`}
                          value={l.action ?? "repair"}
                          onChange={(e) => {
                            const next = { ...(locals[line.id] ?? {}), action: e.target.value };
                            setLocals((prev) => ({ ...prev, [line.id]: next }));
                            scheduleSave(line.id, next);
                          }}
                          aria-label={`Tindak lanjut defect ${line.colorName} ${line.seriesName} size ${line.size}`}
                        >
                          <option value="repair">Perbaikan</option>
                          <option value="reject">Reject</option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      ) : null}

      {printOpen ? (
        <PrintPreview plan={plan} onClose={() => setPrintOpen(false)} />
      ) : null}
    </Drawer>
  );
}