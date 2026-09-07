"use client"

import { IconPlus, IconTrash } from "@tabler/icons-react"

import type {
  PrescriptionDiagnosticRequests,
  PrescriptionMedication,
  PrescriptionPayload,
} from "@/types/medicalDocument"
import {
  diagnosticRequestOptions,
  type DiagnosticRequestCatalog,
} from "@/lib/medical-documents/diagnostic-request-options"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function emptyMedication(): PrescriptionMedication {
  return {
    name: "",
    strength: "",
    quantity: "",
    frequency: "",
    route: "",
    instructions: "",
    duration: "",
  }
}

function ensureDiagnosticRequests(
  value: PrescriptionPayload,
  catalog: DiagnosticRequestCatalog
): PrescriptionDiagnosticRequests {
  const existing = value.diagnosticRequests
  if (existing?.catalog === catalog) {
    return {
      catalog,
      selectedIds: existing.selectedIds ?? [],
      othersText: existing.othersText ?? "",
    }
  }
  return {
    catalog,
    selectedIds: [],
    othersText: "",
  }
}

export function PrescriptionForm({
  value,
  onChange,
  catalog = "physician",
}: {
  value: PrescriptionPayload
  onChange: (value: PrescriptionPayload) => void
  catalog?: DiagnosticRequestCatalog
}) {
  const medications = value.medications.length
    ? value.medications
    : [emptyMedication()]
  const diagnostic = ensureDiagnosticRequests(value, catalog)
  const options = diagnosticRequestOptions(catalog)
  const selected = new Set(diagnostic.selectedIds)
  const othersSelected = selected.has("others")
  const roleLabel = catalog === "dentist" ? "Dentist" : "Physician"

  function updateMedication(index: number, patch: Partial<PrescriptionMedication>) {
    const next = medications.map((med, i) =>
      i === index ? { ...med, ...patch } : med
    )
    onChange({ ...value, medications: next })
  }

  function addMedication() {
    onChange({ ...value, medications: [...medications, emptyMedication()] })
  }

  function removeMedication(index: number) {
    if (medications.length <= 1) return
    onChange({
      ...value,
      medications: medications.filter((_, i) => i !== index),
    })
  }

  function setDiagnostic(next: PrescriptionDiagnosticRequests) {
    onChange({ ...value, diagnosticRequests: next })
  }

  function toggleRequest(id: string, checked: boolean) {
    const nextIds = checked
      ? [...new Set([...diagnostic.selectedIds, id])]
      : diagnostic.selectedIds.filter((item) => item !== id)
    setDiagnostic({
      ...diagnostic,
      selectedIds: nextIds,
      othersText: id === "others" && !checked ? "" : diagnostic.othersText,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="patient-address">Address</Label>
          <Input
            id="patient-address"
            value={value.patientAddress ?? ""}
            onChange={(e) =>
              onChange({ ...value, patientAddress: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patient-age">Age</Label>
          <Input
            id="patient-age"
            value={value.patientAge ?? ""}
            onChange={(e) =>
              onChange({ ...value, patientAge: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patient-sex">Sex</Label>
          <Input
            id="patient-sex"
            value={value.patientSex ?? ""}
            onChange={(e) =>
              onChange({ ...value, patientSex: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <div>
          <Label>Request for</Label>
          <p className="mt-1 text-sm font-medium text-foreground">{roleLabel}</p>
        </div>
        <ul className="space-y-2">
          {options.map((option) => {
            const checked = selected.has(option.id)
            const checkboxId = `diagnostic-${catalog}-${option.id}`
            return (
              <li key={option.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(next) =>
                      toggleRequest(option.id, next === true)
                    }
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="cursor-pointer font-normal leading-5"
                  >
                    {option.isOthers ? "Others:" : option.label}
                  </Label>
                </div>
                {option.isOthers && othersSelected ? (
                  <Input
                    value={diagnostic.othersText ?? ""}
                    onChange={(e) =>
                      setDiagnostic({
                        ...diagnostic,
                        othersText: e.target.value,
                      })
                    }
                    placeholder="Enter custom request"
                    className="ml-6"
                    aria-label="Custom diagnostic request"
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Medications</Label>
          <Button type="button" size="xs" variant="outline" onClick={addMedication}>
            <IconPlus className="size-3.5" />
            Add medication
          </Button>
        </div>

        {medications.map((med, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-border/70 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Medication {index + 1}</p>
              {medications.length > 1 ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => removeMedication(index)}
                  aria-label="Remove medication"
                >
                  <IconTrash className="size-3.5" />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name</Label>
                <Input
                  value={med.name}
                  onChange={(e) =>
                    updateMedication(index, { name: e.target.value })
                  }
                  placeholder="Drug name"
                />
              </div>
              <div className="space-y-2">
                <Label>Strength</Label>
                <Input
                  value={med.strength ?? ""}
                  onChange={(e) =>
                    updateMedication(index, { strength: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  value={med.quantity ?? ""}
                  onChange={(e) =>
                    updateMedication(index, { quantity: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Input
                  value={med.frequency ?? ""}
                  onChange={(e) =>
                    updateMedication(index, { frequency: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  value={med.duration ?? ""}
                  onChange={(e) =>
                    updateMedication(index, { duration: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Instructions</Label>
                <Textarea
                  rows={2}
                  value={med.instructions ?? ""}
                  onChange={(e) =>
                    updateMedication(index, { instructions: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
