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
      {value.medications && value.medications.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Medications from consultation</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {value.medications.map((med, index) => (
              <li key={index}>{med.name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
