"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import type { CurrentUser } from "@/features/auth/current-user";
import styles from "./Sidebar.module.css";

type NavItem = { href: string; label: string; icon: IconName };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Stok bahan",
    items: [
      { href: "/", label: "Beranda", icon: "home" },
      { href: "/warna", label: "Katalog Warna", icon: "grid" },
      { href: "/material", label: "Stok Material", icon: "box" },
      { href: "/mutasi", label: "Mutasi Stok", icon: "swap" },
    ],
  },
  {
    label: "Produksi",
    items: [
      { href: "/jadwal", label: "Jadwal Produksi", icon: "calendar" },
      { href: "/aksesoris", label: "Pasang Aksesoris", icon: "ring" },
      { href: "/bahan", label: "Bahan per Pcs", icon: "flask" },
    ],
  },
  {
    label: "Biaya produksi",
    items: [
      { href: "/pengeluaran", label: "Pengeluaran", icon: "receipt" },
      { href: "/mesin", label: "Mesin", icon: "wrench" },
    ],
  },
  {
    label: "Lainnya",
    items: [{ href: "/pengaturan", label: "Pengaturan", icon: "sliders" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`side ${styles.side}`}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className={`sb-top ${styles.sideTop}`}>
        <div className={`brand ${styles.brand}`}>
          <b>SAMAQU</b>
          <span>Produksi</span>
        </div>
        <button
          type="button"
          className={`sb-btn ${styles.collapseButton}`}
          aria-label={collapsed ? "Buka menu samping" : "Ciutkan menu samping"}
          title={collapsed ? "Buka menu samping" : "Ciutkan menu samping"}
          aria-pressed={collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <Icon name="panel" className={styles.collapseIcon} />
        </button>
      </div>

      <nav className="nav" aria-label="Menu utama">
        {groups.map((group) => (
          <div key={group.label} className={styles.groupBlock}>
            <span className={`grp ${styles.groupLabel}`}>{group.label}</span>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "on" : undefined}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} />
                  <span className={`lb ${styles.label}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`who ${styles.who}`}>
        <span className="ava">{user.initials}</span>
        <div className={styles.whoText}>
          <div className={styles.whoName}>{user.name}</div>
          <div className="sub" style={{ fontSize: 12 }}>
            {user.roleLabel}
          </div>
        </div>
      </div>
    </aside>
  );
}
