"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type VitalNumberMode = "int" | "decimal"

/** Keep only digits, or digits + a single decimal point. */
export function sanitizeVitalNumber(
  raw: string,
  mode: VitalNumberMode = "int"
): string {
  if (mode === "int") {
    return raw.replace(/\D/g, "")
  }
  const cleaned = raw.replace(/[^\d.]/g, "")
  const firstDot = cleaned.indexOf(".")
  if (firstDot === -1) return cleaned
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  )
}

type VitalNumberInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "inputMode" | "onChange" | "value"
> & {
  value: string
  onValueChange: (value: string) => void
  mode?: VitalNumberMode
}

export function VitalNumberInput({
  value,
  onValueChange,
  mode = "int",
  className,
  onKeyDown,
  ...props
}: VitalNumberInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode={mode === "decimal" ? "decimal" : "numeric"}
      pattern={mode === "decimal" ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
      autoComplete="off"
      value={value}
      className={cn("h-9 tabular-nums", className)}
      onChange={(event) => {
        onValueChange(sanitizeVitalNumber(event.target.value, mode))
      }}
      onKeyDown={(event) => {
        // Block letters / symbols at the key level; still allow control keys.
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          const ok =
            mode === "decimal"
              ? /[\d.]/.test(event.key)
              : /\d/.test(event.key)
          if (!ok) {
            event.preventDefault()
          }
        }
        onKeyDown?.(event)
      }}
    />
  )
}
