export function computeOpnameDelta(countedQty: number, recordedQty: number): number {
  return countedQty - recordedQty;
}

export function opnameNote(
  countedQty: number,
  recordedQty: number,
  reason?: string | null,
): string {
  const delta = computeOpnameDelta(countedQty, recordedQty);
  const sign = delta > 0 ? "+" : "";
  const base = `Opname: ${recordedQty} → ${countedQty} (${sign}${delta})`;
  return reason ? `${base} · ${reason}` : base;
}
