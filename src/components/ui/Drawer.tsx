"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./controls";
import styles from "./Drawer.module.css";

const emptySubscribe = () => () => {};

export type DrawerVariant =
  | "side"
  | "wide"
  | "xl"
  | "full"
  | "bottom"
  | "center";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  leading?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: DrawerVariant;
  className?: string;
  bodyClassName?: string;
  headerless?: boolean;
  ariaLabel?: string;
  headerAside?: React.ReactNode;
  titleAside?: React.ReactNode;
};

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  leading,
  children,
  footer,
  variant = "side",
  className,
  bodyClassName,
  headerless = false,
  ariaLabel,
  headerAside,
  titleAside,
}: DrawerProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const root = dialogRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (target ?? root).focus();
    };

    const frame = window.requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = originalOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;

  const overlayClass = [
    "ovl",
    styles.overlay,
    variant === "center" ? styles.center : "",
    variant === "bottom" ? styles.bottom : "",
    variant === "full" ? styles.full : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dialogClass = [
    "dlg",
    variant === "wide" ? "wide" : "",
    variant === "xl" ? "xl" : "",
    styles.dialog,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={overlayClass}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <div
        className={dialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerless ? undefined : titleId}
        aria-label={headerless ? (ariaLabel ?? title) : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        {headerless ? null : (
          <div className={`dlg-h ${styles.header}`}>
            <div className={styles.heading}>
              {leading ? <span className={styles.leading}>{leading}</span> : null}
              <div>
                {eyebrow ? <span className="lbl">{eyebrow}</span> : null}
                <div className={styles.titleRow}>
                  <h2 className="h2" id={titleId} style={eyebrow ? { fontSize: 20 } : undefined}>
                    {title}
                  </h2>
                  {titleAside ? <span className={styles.titleAside}>{titleAside}</span> : null}
                </div>
              </div>
            </div>
            <div className={styles.headerEnd}>
              {headerAside ? <span className={styles.headerAside}>{headerAside}</span> : null}
              <IconButton
                icon="x"
                label="Tutup"
                onClick={() => closeRef.current()}
              />
            </div>
          </div>
        )}
        <div className={`dlg-b ${styles.body} ${bodyClassName ?? ""}`}>{children}</div>
        {footer ? <div className={`dlg-f ${styles.footer}`}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
