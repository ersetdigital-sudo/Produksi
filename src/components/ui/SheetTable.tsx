import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./SheetTable.module.css";

export type MobileRole =
  | "hidden"
  | "title"
  | "subtitle"
  | "badge"
  | "trailing"
  | "meta";

export type SheetColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  mobile?: MobileRole;
  mobileLabel?: string;
};

type SheetTableProps<T> = {
  columns: SheetColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  ariaLabel: string;
  className?: string;
  empty?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
};

function alignClass(align: SheetColumn<unknown>["align"]): string {
  if (align === "right") return styles.right;
  if (align === "center") return styles.center;
  return "";
}

export function SheetTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  ariaLabel,
  className,
  empty,
  rowClassName,
}: SheetTableProps<T>) {
  const template = [
    ...columns.map((column) => column.width ?? "minmax(0,1fr)"),
    ...(rowHref ? ["32px"] : []),
  ].join(" ");

  if (rows.length === 0 && empty) {
    return <div className={styles.emptyWrap}>{empty}</div>;
  }

  const mobileTitle =
    columns.find((column) => column.mobile === "title") ??
    columns.find((column) => column.mobile !== "hidden");
  const mobileBadges = columns.filter((column) => column.mobile === "badge");
  const mobileTrailing = columns.filter((column) => column.mobile === "trailing");
  const mobileSubtitle = columns.filter((column) => column.mobile === "subtitle");
  const mobileMeta = columns.filter((column) => {
    if (column.mobile === "hidden") return false;
    if (column.mobile) {
      return column.mobile === "meta";
    }
    return column.id !== mobileTitle?.id;
  });

  return (
    <div className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")}>
      <div className={styles.desktop} role="table" aria-label={ariaLabel}>
        <div
          className={styles.headerRow}
          style={{ gridTemplateColumns: template }}
          role="row"
        >
          {columns.map((column) => (
            <span
              key={column.id}
              className={[styles.cell, alignClass(column.align)]
                .filter(Boolean)
                .join(" ")}
              role="columnheader"
            >
              {column.header}
            </span>
          ))}
          {rowHref ? <span className={styles.cell} aria-hidden="true" /> : null}
        </div>

        {rows.map((row) => {
          const href = rowHref?.(row);
          const content = (
            <>
              {columns.map((column) => (
                <span
                  key={column.id}
                  className={[styles.cell, alignClass(column.align)]
                    .filter(Boolean)
                    .join(" ")}
                  role="cell"
                >
                  {column.cell(row)}
                </span>
              ))}
              {href ? (
                <span className={styles.chevron} aria-hidden="true">
                  <svg
                    className="i"
                    viewBox="0 0 24 24"
                    style={{ width: 16, height: 16 }}
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </span>
              ) : null}
            </>
          );

          const rowClass = [
            styles.row,
            href ? styles.clickable : "",
            rowClassName?.(row) ?? "",
          ]
            .filter(Boolean)
            .join(" ");

          return href ? (
            <Link
              key={rowKey(row)}
              href={href}
              className={rowClass}
              style={{ gridTemplateColumns: template }}
              role="row"
            >
              {content}
            </Link>
          ) : (
            <div
              key={rowKey(row)}
              className={rowClass}
              style={{ gridTemplateColumns: template }}
              role="row"
            >
              {content}
            </div>
          );
        })}
      </div>

      <div className={styles.cards} role="list">
        {rows.map((row) => {
          const href = rowHref?.(row);
          const card = (
            <>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>
                  {mobileTitle ? mobileTitle.cell(row) : null}
                </div>
                <div className={styles.cardBadges}>
                  {mobileBadges.map((column) => (
                    <span key={column.id}>{column.cell(row)}</span>
                  ))}
                  {mobileTrailing.map((column) => (
                    <span key={column.id}>{column.cell(row)}</span>
                  ))}
                  {href ? (
                    <svg
                      className="i"
                      viewBox="0 0 24 24"
                      style={{ width: 16, height: 16, color: "var(--ink3)" }}
                      aria-hidden="true"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  ) : null}
                </div>
              </div>
              {mobileSubtitle.length > 0 ? (
                <div className={styles.cardSubtitle}>
                  {mobileSubtitle.map((column) => (
                    <span key={column.id}>{column.cell(row)}</span>
                  ))}
                </div>
              ) : null}
              {mobileMeta.length > 0 ? (
                <div className={styles.meta}>
                  {mobileMeta.map((column) => (
                    <div key={column.id} className={styles.metaRow}>
                      <span className="sub">
                        {column.mobileLabel ?? column.header}
                      </span>
                      <span>{column.cell(row)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          );

          return href ? (
            <Link
              key={rowKey(row)}
              href={href}
              className={styles.card}
              role="listitem"
            >
              {card}
            </Link>
          ) : (
            <div key={rowKey(row)} className={styles.card} role="listitem">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
