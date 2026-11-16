"use client";

import { Button } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/icons";
import { Note } from "@/components/ui/primitives";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, hapus",
  cancelLabel = "Batal",
  tone = "danger",
  pending = false,
  error,
  hideCancel = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  error?: string | null;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onCancel}
      title={title}
      variant="center"
      headerless
      ariaLabel={title}
      footer={
        <>
          {hideCancel ? null : (
            <Button variant="secondary" onClick={onCancel} disabled={pending}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Memproses…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
        <span className="ico-no">
          <Icon name="octagon-x" />
        </span>
        <div className="col" style={{ gap: 6 }}>
          <h2 className="h2">{title}</h2>
          <p style={{ color: "var(--ink2)" }}>{description}</p>
        </div>
      </div>
      {error ? <Note tone="danger">{error}</Note> : null}
    </Drawer>
  );
}
