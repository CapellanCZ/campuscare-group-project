/**
 * Display helpers for Base UI Select.
 * Select.Value shows the raw `value` unless Root has `items` or `itemToStringLabel`.
 */

export type SelectLabelOption = {
  value: string
  label: string
}

/** Build a Base UI `items` record from value/label options. */
export function selectItemsRecord(
  options: readonly SelectLabelOption[]
): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.label]))
}

/**
 * Human-readable label for common enum / sentinel select values.
 * Does not change stored values — display only.
 *
 * - `__other__` → `Other`
 * - `student` → `Student`
 * - `go_home_slip` → `Go Home Slip`
 */
export function humanizeSelectLabel(value: unknown): string {
  if (value == null) return ""
  if (typeof value !== "string") return String(value)

  const trimmed = value.trim()
  if (!trimmed) return ""

  const sentinel = trimmed.match(/^_+([a-z0-9_]+)_+$/i)
  if (sentinel) {
    return titleCaseWords(sentinel[1].replace(/_/g, " "))
  }

  if (/^[a-z]+$/.test(trimmed)) {
    return capitalizeWord(trimmed)
  }

  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(trimmed)) {
    return titleCaseWords(trimmed.replace(/_/g, " "))
  }

  return trimmed
}

/** Map weekday index strings (`"0"`…`"6"`) to day names for Select `items`. */
export function dayOfWeekSelectItems(
  labels: readonly string[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
): Record<string, string> {
  return Object.fromEntries(labels.map((label, index) => [String(index), label]))
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(" ")
}
