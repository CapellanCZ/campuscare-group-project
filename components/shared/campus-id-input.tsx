"use client"

import { Input } from "@/components/ui/input"
import {
  CAMPUS_ID_VALIDATION_MESSAGE,
  formatCampusIdInput,
  hasInvalidStudentIdChars,
  type CampusIdKind,
} from "@/lib/students/student-id-input"
import { cn } from "@/lib/utils"

type CampusIdInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  "aria-label"?: string
  disabled?: boolean
  patientType?: CampusIdKind | null
}

function maxLengthFor(kind?: CampusIdKind | null): number {
  if (kind === "faculty" || kind === "employee") return 10
  return 11
}

/** Campus student/employee ID field with YYYY-XXXXX(X) auto-formatting. */
export function CampusIdInput({
  id,
  value,
  onChange,
  className,
  placeholder,
  "aria-label": ariaLabel = "Campus ID",
  disabled,
  patientType,
}: CampusIdInputProps) {
  const kind = patientType ?? "any"
  const resolvedPlaceholder =
    placeholder ??
    (kind === "faculty" || kind === "employee" ? "2026-00100" : "2026-045210")

  function applyRaw(raw: string) {
    onChange(formatCampusIdInput(raw, kind))
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Input
        id={id}
        value={value}
        inputMode="numeric"
        autoComplete="off"
        maxLength={maxLengthFor(kind)}
        placeholder={resolvedPlaceholder}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(event) => applyRaw(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key.length === 1 &&
            /[^\d]/.test(event.key) &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault()
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text")
          if (hasInvalidStudentIdChars(text)) {
            event.preventDefault()
            return
          }
          event.preventDefault()
          applyRaw(text)
        }}
      />
      <p className="sr-only text-xs text-muted-foreground">
        {CAMPUS_ID_VALIDATION_MESSAGE}
      </p>
    </div>
  )
}
