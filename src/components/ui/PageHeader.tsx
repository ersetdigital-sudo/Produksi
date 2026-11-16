import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/controls";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  mobileTitle?: string;
  subtitle?: ReactNode;
  mobileSubtitle?: ReactNode | null;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function PageHeader({
  title,
  mobileTitle,
  subtitle,
  mobileSubtitle,
  actions,
  backHref,
  backLabel = "Kembali",
}: PageHeaderProps) {
  const subtitleHiddenOnMobile = mobileSubtitle === null;

  return (
    <header className={`top ${styles.header}`}>
      <div className={styles.heading}>
        {backHref ? (
          <ButtonLink
            href={backHref}
            variant="secondary"
            size="sm"
            icon="chevron-left"
            aria-label={backLabel}
            className={styles.back}
          />
        ) : null}
        <div className={styles.titles}>
          <h1 className="h1">
            <span className={mobileTitle ? styles.desktopTitle : undefined}>
              {title}
            </span>
            {mobileTitle ? (
              <span className={styles.mobileTitle}>{mobileTitle}</span>
            ) : null}
          </h1>
          {subtitle ? (
            <p className={`sub ${subtitleHiddenOnMobile ? styles.desktopTitle : ""}`}>
              {subtitle}
            </p>
          ) : null}
          {mobileSubtitle && mobileSubtitle !== null ? (
            <p className={`sub ${styles.mobileTitle}`}>{mobileSubtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
