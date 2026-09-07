"use client"

import type { GoHomeSlipPayload } from "@/types/medicalDocument"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function GoHomeSlipForm({
  value,
  onChange,
}: {
  value: GoHomeSlipPayload
  onChange: (value: GoHomeSlipPayload) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="release-date">Release date</Label>
        <Input
          id="release-date"
          type="date"
          value={value.releaseDate ?? ""}
          onChange={(e) => onChange({ ...value, releaseDate: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for release</Label>
        <Textarea
          id="reason"
          rows={4}
          value={value.reason}
          onChange={(e) => onChange({ ...value, reason: e.target.value })}
          placeholder="Medical reason authorizing the patient to go home"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prescribed-medication">Prescribed Medication</Label>
        <Textarea
          id="prescribed-medication"
          rows={3}
          value={value.prescribedMedication ?? ""}
          onChange={(e) =>
            onChange({ ...value, prescribedMedication: e.target.value })
          }
          placeholder="Enter prescribed medication"
        />
      </div>
    </div>
  )
}
