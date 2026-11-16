"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import styles from "./MobileTabBar.module.css";

type Tab = { href: string; label: string; icon: IconName; match: string[] };

const tabs: Tab[] = [
  { href: "/", label: "Beranda", icon: "home", match: ["/"] },
  {
    href: "/warna",
    label: "Stok",
    icon: "grid",
    match: ["/warna", "/material", "/mutasi"],
  },
  {
    href: "/jadwal",
    label: "Produksi",
    icon: "calendar",
    match: ["/jadwal", "/aksesoris", "/bahan"],
  },
  {
    href: "/pengeluaran",
    label: "Biaya",
    icon: "receipt",
    match: ["/pengeluaran", "/mesin"],
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    icon: "sliders",
    match: ["/pengaturan"],
  },
];

function isActive(pathname: string, tab: Tab): boolean {
  if (tab.href === "/") return pathname === "/";
  return tab.match.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className={`tabbar ${styles.tabbar}`} aria-label="Menu utama">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? "on" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
