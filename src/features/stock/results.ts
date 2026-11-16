export type LineResultInput = {
  target: number;
  existingPass: number;
  existingDefect: number;
  nextPass: number;
  nextDefect: number;
  defectReason?: string | null;
  defectAction?: "repair" | "reject" | null;
};

export type ResultValidation =
  | { ok: true; deltaPass: number; deltaDefect: number }
  | { ok: false; error: string };

export function validateLineResult({
  target,
  existingPass,
  existingDefect,
  nextPass,
  nextDefect,
  defectReason,
  defectAction,
}: LineResultInput): ResultValidation {
  if (
    !Number.isInteger(nextPass) ||
    !Number.isInteger(nextDefect) ||
    nextPass < 0 ||
    nextDefect < 0
  ) {
    return { ok: false, error: "Jumlah lolos dan defect harus bilangan bulat." };
  }

  if (nextPass < existingPass || nextDefect < existingDefect) {
    return {
      ok: false,
      error: "Hasil yang sudah diterima tidak bisa dikurangi.",
    };
  }

  if (nextPass + nextDefect > target) {
    return {
      ok: false,
      error: `Lolos + defect melebihi target ${target} pcs.`,
    };
  }

  const deltaPass = nextPass - existingPass;
  const deltaDefect = nextDefect - existingDefect;

  if (
    deltaDefect > 0 &&
    (!defectReason?.trim() ||
      (defectAction !== "repair" && defectAction !== "reject"))
  ) {
    return {
      ok: false,
      error: "Defect baru wajib diisi alasan dan tindak lanjut.",
    };
  }

  return { ok: true, deltaPass, deltaDefect };
}

export function isLineComplete(
  target: number,
  passQty: number,
  defectQty: number,
): boolean {
  return passQty + defectQty === target;
}

export function isPlanComplete(
  lines: { id: string; qty: number }[],
  results: Record<string, { passQty: number; defectQty: number }>,
): boolean {
  return lines.every((line) => {
    const total = results[line.id] ?? { passQty: 0, defectQty: 0 };
    return isLineComplete(line.qty, total.passQty, total.defectQty);
  });
}
