import { SegmentedLinks } from "@/components/ui/SegmentedControl";
import styles from "./MobileSectionNav.module.css";

export function MobileSectionNav({
  items,
  current,
  ariaLabel,
}: {
  items: { value: string; label: string; href: string }[];
  current: string;
  ariaLabel: string;
}) {
  return (
    <div className={styles.nav}>
      <SegmentedLinks
        items={items}
        current={current}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
