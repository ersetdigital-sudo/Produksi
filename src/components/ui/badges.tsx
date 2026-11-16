import { Icon, type IconName } from "./icons";

export type StockStatus = "aman" | "menipis" | "cadangan" | "habis" | "kosong";

const stockConfig: Record<
  StockStatus,
  { label: string; className: string; icon: IconName | null }
> = {
  aman: { label: "Aman", className: "b b-ok", icon: "check-circle" },
  menipis: { label: "Menipis", className: "b b-wr", icon: "alert-triangle" },
  cadangan: {
    label: "Pakai cadangan",
    className: "b b-wr",
    icon: "alert-triangle",
  },
  habis: { label: "Habis", className: "b b-no", icon: "octagon-x" },
  kosong: { label: "Belum diisi", className: "b b-nt", icon: null },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StockStatus;
  label?: string;
  className?: string;
}) {
  const config = stockConfig[status];
  return (
    <span className={`${config.className} ${className ?? ""}`.trim()}>
      {config.icon ? <Icon name={config.icon} /> : null}
      {label ?? config.label}
    </span>
  );
}

export type PlanStatus =
  | "draft"
  | "reserved"
  | "running"
  | "done"
  | "cancelled";

const planConfig: Record<
  PlanStatus,
  { label: string; className: string; icon: IconName }
> = {
  draft: { label: "Draft", className: "b b-nt", icon: "pencil" },
  reserved: { label: "Dicadangkan", className: "b b-jd", icon: "bookmark" },
  running: { label: "Berjalan", className: "b b-run", icon: "play" },
  done: { label: "Selesai", className: "b b-ok", icon: "check" },
  cancelled: { label: "Batal", className: "b b-nt", icon: "x" },
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const config = planConfig[status];
  return (
    <span className={config.className}>
      <Icon name={config.icon} />
      {config.label}
    </span>
  );
}

export function planStatusLabel(status: PlanStatus): string {
  return planConfig[status].label;
}

export type MachineStatus = "active" | "broken";

const machineConfig: Record<
  MachineStatus,
  { label: string; className: string; icon: IconName }
> = {
  active: { label: "Aktif", className: "b b-ok", icon: "check-circle" },
  broken: { label: "Rusak", className: "b b-no", icon: "octagon-x" },
};

export function MachineStatusBadge({ status }: { status: MachineStatus }) {
  const config = machineConfig[status];
  return (
    <span className={config.className}>
      <Icon name={config.icon} />
      {config.label}
    </span>
  );
}

type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "danger";

const badgeTone: Record<BadgeTone, string> = {
  neutral: "b b-nt",
  accent: "b b-jd",
  ok: "b b-ok",
  warn: "b b-wr",
  danger: "b b-no",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: React.ReactNode;
}) {
  return (
    <span className={badgeTone[tone]}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}
