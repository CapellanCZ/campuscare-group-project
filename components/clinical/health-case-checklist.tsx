"use client"

import { healthCaseOptions, type HealthCaseSelection } from "@/lib/health/health-case-options"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function HealthCaseChecklist({
  catalog,
  value,
  onChange,
  readOnly = false,
}: {
  catalog: "physician" | "dentist"
  value: HealthCaseSelection
  onChange: (next: HealthCaseSelection) => void
  readOnly?: boolean
}) {
  const options = healthCaseOptions(catalog)
  const selected = new Set(value.selectedIds)

  function toggle(id: string, checked: boolean) {
    if (readOnly) return
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onChange({
      ...value,
      selectedIds: [...next],
      othersText: id === "others" && !checked ? "" : value.othersText,
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Assessment / Diagnosis</Label>
        <p className="text-xs text-muted-foreground">Select health case(s):</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checkboxId = `health-case-${catalog}-${option.id}`
          const isChecked = selected.has(option.id)
          return (
            <li key={option.id} className="flex min-w-0 items-start gap-2">
              <Checkbox
                id={checkboxId}
                checked={isChecked}
                disabled={readOnly}
                onCheckedChange={(state) => toggle(option.id, state === true)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <label
                  htmlFor={checkboxId}
                  className="text-sm leading-snug peer-disabled:cursor-not-allowed"
                >
                  {option.isOthers ? "Others:" : option.label}
                </label>
                {option.isOthers && isChecked ? (
                  <Input
                    value={value.othersText}
                    disabled={readOnly}
                    placeholder="Specify"
                    onChange={(e) =>
                      onChange({ ...value, othersText: e.target.value })
                    }
                    className="h-8"
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
