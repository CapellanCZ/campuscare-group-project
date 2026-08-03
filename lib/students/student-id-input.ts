/**
 * Campus student IDs look like `2023-172065` (4-digit year, dash, digits).
 * Search inputs should only accept digits and auto-insert the dash.
 */
export function formatStudentIdInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

export function isStudentIdQuery(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^\d{1,4}(-\d{0,6})?$/.test(trimmed)
}
