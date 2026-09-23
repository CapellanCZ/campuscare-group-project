"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import {
  CAMPUS_ID_MAX_DIGITS,
  CAMPUS_ID_MAX_DIGITS_MESSAGE,
  CAMPUS_ID_VALIDATION_MESSAGE,
  campusIdDigitCount,
  campusIdInputMaxLength,
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
  /** When true, show inline validation for non-digits / over-length. */
  showValidation?: boolean
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
  showValidation = false,
}: CampusIdInputProps) {
  // Always format with "any" so live typing is never truncated when parent
  // flips patient type (employee max used to cut digits mid-entry).
  const kind: CampusIdKind = "any"
  const [charError, setCharError] = useState(false)
  const overLength = campusIdDigitCount(value) > CAMPUS_ID_MAX_DIGITS
  const resolvedPlaceholder =
    placeholder ??
    (patientType === "faculty" || patientType === "employee"
      ? "2026-00100"
      : "2026-045210")

  function applyRaw(raw: string) {
    if (hasInvalidStudentIdChars(raw)) {
      setCharError(true)
    } else {
      setCharError(false)
    }
    onChange(formatCampusIdInput(raw, kind))
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Input
        id={id}
        value={value}
        inputMode="numeric"
        autoComplete="off"
        maxLength={campusIdInputMaxLength(kind)}
        placeholder={resolvedPlaceholder}
        aria-label={ariaLabel}
        aria-invalid={charError || overLength || undefined}
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
            setCharError(true)
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text")
          event.preventDefault()
          applyRaw(text)
        }}
      />
      {showValidation && charError ? (
        <p className="text-xs text-destructive" role="alert">
          {CAMPUS_ID_VALIDATION_MESSAGE}
        </p>
      ) : showValidation && overLength ? (
        <p className="text-xs text-destructive" role="alert">
          {CAMPUS_ID_MAX_DIGITS_MESSAGE}
        </p>
      ) : (
        <p className="sr-only">{CAMPUS_ID_VALIDATION_MESSAGE}</p>
      )}
    </div>
  )
}
