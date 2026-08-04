"use client"

import { useState } from "react"
import { IconSearch } from "@tabler/icons-react"

import { Input } from "@/components/ui/input"
import {
  STUDENT_ID_VALIDATION_MESSAGE,
  formatStudentIdInput,
  hasInvalidStudentIdChars,
} from "@/lib/students/student-id-input"
import { cn } from "@/lib/utils"

type StudentIdSearchInputProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  inputClassName?: string
  placeholder?: string
  "aria-label"?: string
  showIcon?: boolean
  id?: string
}

export function StudentIdSearchInput({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = "Search by Student ID",
  "aria-label": ariaLabel = "Search by Student ID",
  showIcon = true,
  id,
}: StudentIdSearchInputProps) {
  const [showError, setShowError] = useState(false)

  function applyRaw(raw: string) {
    if (hasInvalidStudentIdChars(raw)) {
      setShowError(true)
    } else {
      setShowError(false)
    }
    onChange(formatStudentIdInput(raw))
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="relative min-w-0">
        {showIcon ? (
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          className={cn(showIcon && "pl-8", inputClassName)}
          placeholder={placeholder}
          value={value}
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          aria-label={ariaLabel}
          aria-invalid={showError || undefined}
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
              setShowError(true)
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text")
            if (hasInvalidStudentIdChars(text)) {
              event.preventDefault()
              applyRaw(text)
            }
          }}
        />
      </div>
      {showError ? (
        <p className="text-xs text-destructive" role="alert">
          {STUDENT_ID_VALIDATION_MESSAGE}
        </p>
      ) : null}
    </div>
  )
}
