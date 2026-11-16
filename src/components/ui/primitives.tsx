import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import styles from "./primitives.module.css";

export function Card({
  children,
  className,
  padded = false,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  labelledBy?: string;
}) {
  return (
    <section
      className={["card", padded ? "pad" : "", styles.card, className ?? ""]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  badge,
  compact = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={["card", "stat", styles.card, className ?? ""].filter(Boolean).join(" ")}>
      {badge ? (
        <span style={{ alignSelf: "flex-start", display: "inline-flex" }}>
          {badge}
        </span>
      ) : (
        <span className="lbl">{label}</span>
      )}
      <span
        className={[
          "v",
          styles.statValue,
          compact ? styles.statValueCompact : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
      {sub ? <span className="sub">{sub}</span> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
  id,
  level = 2,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  id?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionHeaderTitles}>
        <Heading className={level === 3 ? "h3" : "h2"} id={id}>
          {title}
        </Heading>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.sectionHeaderActions}>{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["col", styles.empty, className ?? ""].filter(Boolean).join(" ")}>
      <b>{title}</b>
      {description ? <span className="sub">{description}</span> : null}
      {action}
    </div>
  );
}

export function Legend({ children }: { children: ReactNode }) {
  return (
    <div className={styles.legend} aria-label="Arti status">
      {children}
    </div>
  );
}

export function LegendItem({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <span className={styles.legendItem}>
      {children}
      {hint ? <span className="sub">{hint}</span> : null}
    </span>
  );
}

export type NoteTone = "info" | "warning" | "danger";

const noteClass: Record<NoteTone, string> = {
  info: "note note-in",
  warning: "note note-wr",
  danger: "note note-no",
};

const noteIcon: Record<NoteTone, IconName> = {
  info: "info",
  warning: "alert-triangle",
  danger: "octagon-x",
};

export function Note({
  tone = "info",
  icon,
  children,
}: {
  tone?: NoteTone;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <div className={noteClass[tone]}>
      <Icon name={icon ?? noteIcon[tone]} />
      <div>{children}</div>
    </div>
  );
}

export function ProgressBar({
  value,
  children,
  className,
}: {
  value: number;
  children?: ReactNode;
  className?: string;
}) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <span className={["pg", styles.progress, className ?? ""].filter(Boolean).join(" ")}>
      <i aria-hidden="true">
        <b style={{ width }} />
      </i>
      {children}
    </span>
  );
}

export function Swatch({
  color,
  size = 14,
  radius = 4,
  label,
  className,
}: {
  color: string;
  size?: number;
  radius?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={["sw", className ?? ""].filter(Boolean).join(" ")}
      style={
        {
          "--c": color,
          width: size,
          height: size,
          borderRadius: radius,
        } as CSSProperties
      }
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function KvList({
  items,
  className,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={[styles.kvList, className ?? ""].filter(Boolean).join(" ")}>
      {items.map((item, index) => (
        <div className="kv" key={index} style={index === 0 ? { borderTop: 0 } : undefined}>
          <span className="sub">{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
