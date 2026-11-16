"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button, ButtonLink, Field, Input, Select } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Note } from "@/components/ui/primitives";
import type { ActionResult } from "../actions";
import {
  deleteConversion,
  deleteExpenseCategory,
  deleteMaterialType,
  deleteSlot,
  saveConversion,
  saveExpenseCategory,
  saveMaterialType,
  saveSlot,
} from "../actions";
import type {
  SettingsCategory,
  SettingsConversion,
  SettingsData,
  SettingsSlot,
  SettingsType,
} from "../queries";
import styles from "./settings.module.css";

type DrawerState =
  | { kind: "slot"; mode: "tambah" }
  | { kind: "slot"; mode: "ubah"; item: SettingsSlot }
  | { kind: "type"; mode: "tambah" }
  | { kind: "type"; mode: "ubah"; item: SettingsType }
  | { kind: "conversion"; mode: "tambah" }
  | { kind: "conversion"; mode: "ubah"; item: SettingsConversion }
  | { kind: "category"; mode: "tambah" }
  | { kind: "category"; mode: "ubah"; item: SettingsCategory }
  | null;

type ConfirmState = {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  hideCancel?: boolean;
  run?: () => Promise<ActionResult>;
};

function SectionCard({
  title,
  subtitle,
  open,
  onToggle,
  onAdd,
  bodyClassName,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div
        className={styles.sectionHeader}
        data-open={open ? "true" : "false"}
      >
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className={styles.sectionTitleBlock}>
            <span className="h2">{title}</span>
            <span className="sub">{subtitle}</span>
          </span>
          <Icon
            name={open ? "chevron-up" : "chevron-down"}
            className={styles.sectionChevron}
          />
        </button>
        <Button
          variant="secondary"
          size="sm"
          icon="plus"
          onClick={onAdd}
          className={styles.addButton}
        >
          Tambah
        </Button>
      </div>
      <div
        className={`${styles.sectionBody} ${bodyClassName ?? ""}`}
        data-open={open ? "true" : "false"}
      >
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  title,
  subtitle,
  meta,
  badge,
  grip = false,
  onEdit,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  grip?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={styles.settingRow}>
      {grip ? <Icon name="grip" className={styles.grip} /> : null}
      <div className={styles.rowText}>
        <b>{title}</b>
        {subtitle ? <div className="sub">{subtitle}</div> : null}
      </div>
      {meta ? <span className="sub">{meta}</span> : null}
      {badge}
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Ubah
      </Button>
    </div>
  );
}

function FormFooter({
  item,
  pending,
  onDelete,
  onClose,
  onSubmit,
  submitLabel,
}: {
  item: unknown;
  pending: boolean;
  onDelete: () => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <>
      {item ? (
        <Button
          variant="dangerGhost"
          className={styles.hapus}
          icon="trash"
          onClick={onDelete}
          disabled={pending}
        >
          Hapus
        </Button>
      ) : null}
      <Button variant="secondary" onClick={onClose} disabled={pending}>
        Batal
      </Button>
      <Button variant="primary" onClick={onSubmit} disabled={pending}>
        {pending ? "Menyimpan…" : submitLabel}
      </Button>
    </>
  );
}

function SlotForm({
  item,
  data,
  onClose,
  onSaved,
  onDelete,
}: {
  item?: SettingsSlot;
  data: SettingsData;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [materialTypeId, setMaterialTypeId] = useState(
    item?.materialTypeId ?? data.types[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama slot wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await saveSlot({
        id: item?.id,
        name,
        materialTypeId,
      });
      if (!result.ok) setError(result.error);
      else onSaved();
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Drawer
        open
        onClose={onClose}
        title={item ? "Ubah slot pasangan" : "Tambah slot pasangan"}
        footer={
          <FormFooter
            item={item}
            pending={pending}
            onDelete={onDelete}
            onClose={onClose}
            onSubmit={submit}
            submitLabel={item ? "Simpan perubahan" : "Tambah"}
          />
        }
      >
        {error ? <Note tone="danger">{error}</Note> : null}
        <Field
          label="Nama slot"
          htmlFor="slot-name"
          hint="Nama ini jadi judul kolom di Katalog Warna dan form barang keluar."
        >
          <Input
            id="slot-name"
            value={name}
            placeholder="Misalnya: Benang bordir"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          label="Diisi dari jenis material"
          htmlFor="slot-type"
          hint="Kode yang bisa dipilih di slot ini diambil dari jenis material ini."
        >
          <Select
            id="slot-type"
            value={materialTypeId}
            onChange={(event) => setMaterialTypeId(event.target.value)}
          >
            {data.types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>
        <Note tone="info">
          {item
            ? "Nama baru langsung tampil di semua warna. Kode yang sudah diisi tidak berubah."
            : "Slot baru muncul sebagai kolom berikutnya di semua warna, isinya \"Belum diisi\". Data lama tidak berubah."}
        </Note>
      </Drawer>
    </form>
  );
}

function TypeForm({
  item,
  data,
  onClose,
  onSaved,
  onDelete,
}: {
  item?: SettingsType;
  data: SettingsData;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "pcs");
  const [defaultMin, setDefaultMin] = useState(
    item ? String(item.defaultMin) : "0",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unitOptions = Array.from(
    new Set(["cone", "pcs", "gross", "m", "roll", "set", unit]),
  );

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama jenis material wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await saveMaterialType({
        id: item?.id,
        name,
        unit,
        defaultMin: Number(defaultMin || 0),
      });
      if (!result.ok) setError(result.error);
      else onSaved();
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Drawer
        open
        onClose={onClose}
        title={item ? "Ubah jenis material" : "Tambah jenis material"}
        footer={
          <FormFooter
            item={item}
            pending={pending}
            onDelete={onDelete}
            onClose={onClose}
            onSubmit={submit}
            submitLabel={item ? "Simpan perubahan" : "Tambah"}
          />
        }
      >
        {error ? <Note tone="danger">{error}</Note> : null}
        <Field label="Nama jenis material" htmlFor="type-name">
          <Input
            id="type-name"
            value={name}
            placeholder="Misalnya: Benang Bordir"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          label="Satuan stok"
          htmlFor="type-unit"
          hint="Sisa stok semua kode di jenis ini dihitung dengan satuan ini."
        >
          <Select
            id="type-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          >
            {unitOptions.map((option) => (
              <option key={option} value={option}>
                {option === "m" ? "meter (m)" : option}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Minimum bawaan (opsional)"
          htmlFor="type-min"
          hint="Dipakai untuk kode baru di jenis ini. Tiap kode tetap bisa diatur sendiri."
        >
          <Input
            id="type-min"
            numeric
            inputMode="decimal"
            value={defaultMin}
            onChange={(event) => setDefaultMin(event.target.value)}
          />
        </Field>
        {data.types.length === 0 ? (
          <p className="sub">Belum ada jenis material.</p>
        ) : null}
      </Drawer>
    </form>
  );
}

function ConversionForm({
  item,
  onClose,
  onSaved,
  onDelete,
}: {
  item?: SettingsConversion;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [scope, setScope] = useState(item?.scope ?? "Benang");
  const [fromUnit, setFromUnit] = useState(item?.fromUnit ?? "");
  const [factor, setFactor] = useState(
    item?.factor === null || item?.factor === undefined
      ? ""
      : String(item.factor),
  );
  const [toUnit, setToUnit] = useState(item?.toUnit ?? "cone");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!fromUnit.trim()) {
      setError("Satuan beli wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await saveConversion({
        id: item?.id,
        scope,
        fromUnit,
        factor: factor.trim() === "" ? null : Number(factor),
        toUnit,
      });
      if (!result.ok) setError(result.error);
      else onSaved();
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Drawer
        open
        onClose={onClose}
        title={item ? "Ubah konversi satuan" : "Tambah konversi satuan"}
        footer={
          <FormFooter
            item={item}
            pending={pending}
            onDelete={onDelete}
            onClose={onClose}
            onSubmit={submit}
            submitLabel={item ? "Simpan perubahan" : "Tambah"}
          />
        }
      >
        {error ? <Note tone="danger">{error}</Note> : null}
        <Field label="Dipakai untuk" htmlFor="conversion-scope">
          <Select
            id="conversion-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option>Benang</option>
            <option>Kancing</option>
            <option>Resleting</option>
          </Select>
        </Field>
        <div className="col" style={{ gap: 6 }}>
          <span className="flabel">Konversi</span>
          <div className={styles.conversionRow}>
            <span className={styles.conversionNumber}>1</span>
            <Input
              aria-label="Satuan beli"
              value={fromUnit}
              placeholder="satuan beli"
              onChange={(event) => setFromUnit(event.target.value)}
            />
            <span>=</span>
            <Input
              aria-label="Jumlah satuan stok"
              numeric
              inputMode="numeric"
              value={factor}
              placeholder="0"
              style={{ width: 90 }}
              onChange={(event) => setFactor(event.target.value)}
            />
            <Select
              aria-label="Satuan stok"
              value={toUnit}
              style={{ width: 120 }}
              onChange={(event) => setToUnit(event.target.value)}
            >
              <option>cone</option>
              <option>pcs</option>
              <option>gross</option>
              <option>meter</option>
            </Select>
          </div>
          <span className="hint">
            Contoh: 1 lusin = 12 cone. Saat Lea mencatat barang masuk 2 lusin,
            stok otomatis bertambah 24 cone.
          </span>
        </div>
      </Drawer>
    </form>
  );
}

function CategoryForm({
  item,
  onClose,
  onSaved,
  onDelete,
}: {
  item?: SettingsCategory;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [requiresMachine, setRequiresMachine] = useState(
    item?.requiresMachine ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await saveExpenseCategory({
        id: item?.id,
        name,
        requiresMachine,
      });
      if (!result.ok) setError(result.error);
      else onSaved();
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Drawer
        open
        onClose={onClose}
        title={item ? "Ubah kategori pengeluaran" : "Tambah kategori pengeluaran"}
        footer={
          <FormFooter
            item={item}
            pending={pending}
            onDelete={onDelete}
            onClose={onClose}
            onSubmit={submit}
            submitLabel={item ? "Simpan perubahan" : "Tambah"}
          />
        }
      >
        {error ? <Note tone="danger">{error}</Note> : null}
        <Field label="Nama kategori" htmlFor="category-name">
          <Input
            id="category-name"
            value={name}
            placeholder="Misalnya: Listrik"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={requiresMachine}
            onChange={(event) => setRequiresMachine(event.target.checked)}
          />
          <span>
            <b style={{ fontSize: 14 }}>Minta pilih mesin</b>
            <span className="sub" style={{ display: "block" }}>
              Saat mencatat pengeluaran di kategori ini, Lea wajib memilih
              mesinnya. Biayanya ikut masuk ke riwayat mesin itu.
            </span>
          </span>
        </label>
      </Drawer>
    </form>
  );
}

export function SettingsPage({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmPending, startConfirm] = useTransition();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    slot: true,
    type: false,
    conversion: false,
    category: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const saved = () => {
    setDrawer(null);
    router.refresh();
  };

  const requestDeleteSlot = (item: SettingsSlot) => {
    setDrawer(null);
    setConfirm({
      title: `Hapus slot ${item.name}?`,
      description: `Kolom ${item.name} hilang dari Katalog Warna dan form barang keluar, dan kode yang sudah diisi di kolom ini terlepas dari semua warna. Stok materialnya tidak berubah.`,
      run: () => deleteSlot(item.id),
    });
  };

  const requestDeleteType = (item: SettingsType) => {
    setDrawer(null);
    if (item.materialCount > 0) {
      setConfirm({
        title: `Jenis ${item.name} belum bisa dihapus`,
        description: `Jenis ini masih punya ${item.materialCount} kode di Stok Material. Hapus atau pindahkan kode-kodenya dulu, baru jenis ini bisa dihapus.`,
        confirmLabel: "Mengerti",
        tone: "primary",
        hideCancel: true,
      });
      return;
    }
    if (item.slotCount > 0) {
      setConfirm({
        title: `Jenis ${item.name} belum bisa dihapus`,
        description:
          "Slot pasangan masih mengambil kode dari jenis ini. Hapus atau ubah slotnya dulu di bagian Slot pasangan.",
        confirmLabel: "Mengerti",
        tone: "primary",
        hideCancel: true,
      });
      return;
    }
    setConfirm({
      title: `Hapus jenis ${item.name}?`,
      description:
        "Jenis ini tidak bisa dipilih lagi. Kode yang sudah ada di jenis ini tidak berubah.",
      run: () => deleteMaterialType(item.id),
    });
  };

  const requestDeleteConversion = (item: SettingsConversion) => {
    setDrawer(null);
    setConfirm({
      title: `Hapus konversi 1 ${item.fromUnit} = ${
        item.factor ?? "?"
      } ${item.toUnit}?`,
      description: `Barang masuk tidak bisa dicatat lagi dalam satuan ${item.fromUnit}. Stok yang sudah tercatat tidak berubah.`,
      run: () => deleteConversion(item.id),
    });
  };

  const requestDeleteCategory = (item: SettingsCategory) => {
    setDrawer(null);
    setConfirm({
      title: `Hapus kategori ${item.name}?`,
      description:
        "Kategori ini tidak bisa dipilih lagi. Pengeluaran lama di kategori ini tetap tersimpan dan tetap dihitung di ringkasan.",
      run: () => deleteExpenseCategory(item.id),
    });
  };

  const runConfirm = () => {
    if (!confirm) return;
    if (!confirm.run) {
      setConfirm(null);
      return;
    }
    setConfirmError(null);
    startConfirm(async () => {
      const result = await confirm.run?.();
      if (!result) return;
      if (result.ok) {
        setConfirm(null);
        router.refresh();
      } else {
        setConfirmError(result.error);
      }
    });
  };

  return (
    <>
      <PageHeader
        title="Pengaturan"
        subtitle="Atur isi dashboard tanpa perlu programmer. Perubahan di sini tidak menghapus data yang sudah ada."
      />

      <section className={`card ${styles.bannerRow}`}>
        <div className={styles.bannerText}>
          <h2 className="h2">Bahan per Pcs sudah pindah</h2>
          <p className="sub">
            Sekarang diatur per series (Jiharkah, Nahawand, dan series baru) di
            menu Produksi › Bahan per Pcs, termasuk kain keras per bagian dan
            aksesoris series turunan.
          </p>
        </div>
        <div className={styles.bannerAction}>
          <ButtonLink
            href="/bahan"
            variant="secondary"
            iconAfter="chevron-right"
          >
            Buka Bahan per Pcs
          </ButtonLink>
        </div>
      </section>

      <div className={styles.grid}>
        <SectionCard
          title="Slot pasangan"
          subtitle="Kolom pasangan tiap warna kain. Urutan di sini = urutan di Katalog Warna."
          open={openSections.slot ?? false}
          onToggle={() => toggleSection("slot")}
          onAdd={() => setDrawer({ kind: "slot", mode: "tambah" })}
        >
          {data.slots.map((item) => (
            <SettingRow
              key={item.id}
              grip
              title={item.name}
              subtitle={`Diisi dari jenis: ${item.materialTypeName}`}
              onEdit={() =>
                setDrawer({ kind: "slot", mode: "ubah", item })
              }
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Jenis material"
          subtitle="Kelompok kode di Stok Material"
          open={openSections.type ?? false}
          onToggle={() => toggleSection("type")}
          onAdd={() => setDrawer({ kind: "type", mode: "tambah" })}
          bodyClassName={styles.typeSectionBody}
        >
          {data.types.map((item) => (
            <SettingRow
              key={item.id}
              title={item.name}
              meta={`satuan ${item.unit} · ${item.materialCount} kode`}
              onEdit={() =>
                setDrawer({ kind: "type", mode: "ubah", item })
              }
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Satuan dan konversi"
          subtitle="1 satuan beli = berapa satuan stok"
          open={openSections.conversion ?? false}
          onToggle={() => toggleSection("conversion")}
          onAdd={() => setDrawer({ kind: "conversion", mode: "tambah" })}
        >
          {data.conversions.map((item) => (
            <SettingRow
              key={item.id}
              title={
                <span className="num">
                  1 {item.fromUnit} = {item.factor ?? "[isi]"} {item.toUnit}
                </span>
              }
              subtitle={`Dipakai untuk ${item.scope}`}
              onEdit={() =>
                setDrawer({ kind: "conversion", mode: "ubah", item })
              }
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Kategori pengeluaran"
          subtitle="Sebagian kategori meminta pilih mesin"
          open={openSections.category ?? false}
          onToggle={() => toggleSection("category")}
          onAdd={() => setDrawer({ kind: "category", mode: "tambah" })}
        >
          {data.categories.map((item) => (
            <SettingRow
              key={item.id}
              title={item.name}
              badge={
                item.requiresMachine ? (
                  <span className="b b-nt">Pilih mesin</span>
                ) : null
              }
              onEdit={() =>
                setDrawer({ kind: "category", mode: "ubah", item })
              }
            />
          ))}
        </SectionCard>
      </div>

      {drawer?.kind === "slot" ? (
        <SlotForm
          key={drawer.mode === "ubah" ? drawer.item.id : "slot-baru"}
          item={drawer.mode === "ubah" ? drawer.item : undefined}
          data={data}
          onClose={() => setDrawer(null)}
          onSaved={saved}
          onDelete={() => {
            if (drawer.mode === "ubah") requestDeleteSlot(drawer.item);
          }}
        />
      ) : null}

      {drawer?.kind === "type" ? (
        <TypeForm
          key={drawer.mode === "ubah" ? drawer.item.id : "type-baru"}
          item={drawer.mode === "ubah" ? drawer.item : undefined}
          data={data}
          onClose={() => setDrawer(null)}
          onSaved={saved}
          onDelete={() => {
            if (drawer.mode === "ubah") requestDeleteType(drawer.item);
          }}
        />
      ) : null}

      {drawer?.kind === "conversion" ? (
        <ConversionForm
          key={drawer.mode === "ubah" ? drawer.item.id : "conversion-baru"}
          item={drawer.mode === "ubah" ? drawer.item : undefined}
          onClose={() => setDrawer(null)}
          onSaved={saved}
          onDelete={() => {
            if (drawer.mode === "ubah") requestDeleteConversion(drawer.item);
          }}
        />
      ) : null}

      {drawer?.kind === "category" ? (
        <CategoryForm
          key={drawer.mode === "ubah" ? drawer.item.id : "category-baru"}
          item={drawer.mode === "ubah" ? drawer.item : undefined}
          onClose={() => setDrawer(null)}
          onSaved={saved}
          onDelete={() => {
            if (drawer.mode === "ubah") requestDeleteCategory(drawer.item);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        hideCancel={confirm?.hideCancel}
        pending={confirmPending}
        error={confirmError}
        onConfirm={runConfirm}
        onCancel={() => {
          setConfirm(null);
          setConfirmError(null);
        }}
      />
    </>
  );
}
