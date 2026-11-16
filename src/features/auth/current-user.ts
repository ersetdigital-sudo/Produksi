export type Role = "admin" | "owner" | "viewer";

export type CurrentUser = {
  id: string;
  name: string;
  initials: string;
  role: Role;
  roleLabel: string;
};

export const CURRENT_USER: CurrentUser = {
  id: "lea",
  name: "Lea",
  initials: "LE",
  role: "admin",
  roleLabel: "Admin · bisa input",
};

export function canInput(role: Role): boolean {
  return role === "admin" || role === "owner";
}

export function canManageSettings(role: Role): boolean {
  return role === "admin";
}
