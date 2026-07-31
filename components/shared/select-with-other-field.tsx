"use client"

import { useEffect, useId, useState } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  OTHER_SELECT_VALUE,
  isPresetFormOption,
  type FormSelectOption,
} from "@/lib/health/form-options"
import { cn } from "@/lib/utils"

type SelectWithOtherFieldProps = {
  id?: string
  label: string
  options: readonly FormSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  otherLabel?: string
  otherPlaceholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  labelClassName?: string
}

/**
 * Preset Select with an Other choice that reveals a free-text input.
 * Remount with a `key` when the sheet/ticket resets so Other mode clears cleanly.
 */
export function SelectWithOtherField({
  id,
  label,
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  otherLabel = "Please specify",
  otherPlaceholder = "Type a custom value",
  disabled,
  required,
  className,
  labelClassName,
}: SelectWithOtherFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const otherId = `${fieldId}-other`
  const isPreset = isPresetFormOption(options, value)
  const [otherMode, setOtherMode] = useState(!isPreset && value.length > 0)

  useEffect(() => {
    if (isPreset) setOtherMode(false)
    else if (value.length > 0) setOtherMode(true)
  }, [isPreset, value])

  const showOther = otherMode || (!isPreset && value.length > 0)
  const selectValue = showOther
    ? OTHER_SELECT_VALUE
    : isPreset
      ? value
      : null

  return (
    <div className={cn("space-y-2", className)}>
      <Field className="gap-1">
        <FieldLabel htmlFor={fieldId} className={labelClassName}>
          {label}
        </FieldLabel>
        <Select
          value={selectValue}
          onValueChange={(next) => {
            if (!next) return
            if (next === OTHER_SELECT_VALUE) {
              setOtherMode(true)
              if (isPreset) onValueChange("")
              return
            }
            setOtherMode(false)
            onValueChange(next)
          }}
          disabled={disabled}
        >
          <SelectTrigger
            id={fieldId}
            className="w-full"
            aria-label={label}
            disabled={disabled}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value={OTHER_SELECT_VALUE}>Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {showOther ? (
        <Field
          className="gap-1 duration-150 animate-in fade-in-0 slide-in-from-top-1"
          data-slot="select-other"
        >
          <FieldLabel htmlFor={otherId} className={labelClassName}>
            {otherLabel}
          </FieldLabel>
          <Input
            id={otherId}
            value={isPreset ? "" : value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={otherPlaceholder}
            disabled={disabled}
            required={required}
            autoComplete="off"
          />
        </Field>
      ) : null}
    </div>
  )
}
