"use client";

import type { ReactNode } from "react";
import styles from "./Tabs.module.css";

export type TabItem = {
  value: string;
  label: ReactNode;
  count?: number;
};

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel,
  variant = "attached",
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  variant?: "attached" | "plain";
  className?: string;
}) {
  return (
    <div
      className={[
        "tabs",
        variant === "plain" ? styles.plain : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? "on" : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined ? <span className="n">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
