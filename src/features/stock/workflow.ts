export type PlanStatus =
  | "draft"
  | "reserved"
  | "running"
  | "done"
  | "cancelled";

const transitions: Record<PlanStatus, PlanStatus[]> = {
  draft: ["reserved", "cancelled"],
  reserved: ["running", "cancelled"],
  running: ["done"],
  done: [],
  cancelled: [],
};

export function canTransition(
  from: PlanStatus,
  to: PlanStatus,
): boolean {
  return transitions[from].includes(to);
}

export function canEditPlan(status: PlanStatus): boolean {
  return status === "draft";
}

export function canReturnMaterial(status: PlanStatus): boolean {
  return status === "running" || status === "done";
}
