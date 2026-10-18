export function roleRequiresMfa(role: string | null | undefined) {
  return role === "clinic_admin" || role === "platform_admin";
}
