"use client"

import { Input } from "@/components/ui/input"
import {
  STUDENT_ID_VALIDATION_MESSAGE,
  formatStudentIdInput,
  hasInvalidStudentIdChars,
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
}

/** Campus student/employee ID field with YYYY-XXXXXX auto-formatting. */
export function CampusIdInput({
  id,
  value,
  onChange,
  className,
  placeholder = "YYYY-XXXXXX",
  "aria-label": ariaLabel = "Campus ID",
  disabled,
}: CampusIdInputProps) {
  function applyRaw(raw: string) {
    onChange(formatStudentIdInput(raw))
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Input
        id={id}
        value={value}
        inputMode="numeric"
        autoComplete="off"
        maxLength={11}
        placeholder={placeholder}
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
      <p className="text-xs text-muted-foreground sr-only">
        {STUDENT_ID_VALIDATION_MESSAGE}
      </p>
    </div>
  )
}
