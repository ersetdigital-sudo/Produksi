"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./SegmentedControl.module.css";

export type SegmentItem = {
  value: string;
  label: ReactNode;
  count?: number;
};

export function SegmentedControl({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: SegmentItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={["seg", styles.seg, className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={value === item.value ? "on" : undefined}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined ? <span className="n">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function SegmentedLinks({
  items,
  current,
  ariaLabel,
  className,
}: {
  items: { value: string; label: ReactNode; href: string }[];
  current: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={["seg", styles.seg, className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          className={current === item.value ? "on" : undefined}
          aria-current={current === item.value ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
