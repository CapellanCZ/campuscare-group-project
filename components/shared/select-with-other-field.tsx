"use client"

import { useEffect, useId, useMemo, useState } from "react"

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
import { selectItemsRecord } from "@/lib/ui/select-label"
import { cn } from "@/lib/utils"

type SelectWithOtherFieldProps = {
  id?: string
  label: string
  options: readonly FormSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  otherLabel?: string
  otherOptionLabel?: string
  otherPlaceholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  labelClassName?: string
  /**
   * When true and the value is a non-preset custom string, hide the Other
   * select and show only the free-text field (label stays the primary field label).
   */
  preferCustomValueOnly?: boolean
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
  otherOptionLabel = "Other",
  otherPlaceholder = "Type a custom value",
  disabled,
  required,
  className,
  labelClassName,
  preferCustomValueOnly = false,
}: SelectWithOtherFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const otherId = `${fieldId}-other`
  const isPreset = isPresetFormOption(options, value)
  const [otherMode, setOtherMode] = useState(
    Boolean(value) &&
      value !== OTHER_SELECT_VALUE &&
      !isPresetFormOption(options, value)
  )

  useEffect(() => {
    if (isPreset) setOtherMode(false)
    else if (value.length > 0 && value !== OTHER_SELECT_VALUE) setOtherMode(true)
    else if (!value) setOtherMode(false)
  }, [isPreset, value])

  const showOther =
    otherMode ||
    (Boolean(value) && value !== OTHER_SELECT_VALUE && !isPreset)
  const hasCustomValue =
    showOther && Boolean(value) && value !== OTHER_SELECT_VALUE && !isPreset
  const customOnly = preferCustomValueOnly && hasCustomValue
  const selectValue = showOther
    ? OTHER_SELECT_VALUE
    : isPreset
      ? value
      : null

  const items = useMemo(
    () =>
      selectItemsRecord([
        ...options.map((option) => ({
          value: option.value,
          label: option.label,
        })),
        { value: OTHER_SELECT_VALUE, label: otherOptionLabel },
      ]),
    [options, otherOptionLabel]
  )

  return (
    <div className={cn("space-y-2", className)}>
      {customOnly ? (
        <Field className="gap-1">
          <FieldLabel htmlFor={otherId} className={labelClassName}>
            {label}
          </FieldLabel>
          <Input
            id={otherId}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={otherPlaceholder}
            disabled={disabled}
            required={required}
            autoComplete="off"
          />
          <button
            type="button"
            className="text-left text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            disabled={disabled}
            onClick={() => {
              setOtherMode(false)
              onValueChange("")
            }}
          >
            Choose a preset instead
          </button>
        </Field>
      ) : (
        <>
          <Field className="gap-1">
            <FieldLabel htmlFor={fieldId} className={labelClassName}>
              {label}
            </FieldLabel>
            <Select
              value={selectValue}
              items={items}
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
                <SelectItem value={OTHER_SELECT_VALUE}>
                  {otherOptionLabel}
                </SelectItem>
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
        </>
      )}
    </div>
  )
}
