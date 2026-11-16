export type OutboundPairing = {
  primaryMaterialId: string | null;
  backupMaterialId: string | null;
  primaryStock: number;
  backupStock: number;
};

export type OutboundChoice = {
  materialId: string | null;
  usedBackup: boolean;
};

export function resolveOutboundMaterial(
  pairing: OutboundPairing,
  useBackup: boolean,
): OutboundChoice {
  if (!pairing.primaryMaterialId) {
    if (useBackup && pairing.backupMaterialId) {
      return { materialId: pairing.backupMaterialId, usedBackup: true };
    }
    return { materialId: null, usedBackup: false };
  }

  if (
    useBackup &&
    pairing.backupMaterialId &&
    pairing.primaryStock <= 0
  ) {
    return { materialId: pairing.backupMaterialId, usedBackup: true };
  }

  return { materialId: pairing.primaryMaterialId, usedBackup: false };
}

export function isShortage(stock: number, qty: number): boolean {
  return stock < qty;
}
