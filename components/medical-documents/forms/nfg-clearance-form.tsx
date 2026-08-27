"use client"

import { NFG_CLEARANCE_STATUS_OPTIONS } from "@/features/medical-documents/lib/document-labels"
import type { NfgClearancePayload } from "@/types/medicalDocument"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function NfgClearanceForm({
  value,
  onChange,
}: {
  value: NfgClearancePayload
  onChange: (value: NfgClearancePayload) => void
}) {
  const physical = value.physical ?? {}

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Sport</Label>
          <Input
            value={value.sport ?? ""}
            onChange={(e) => onChange({ ...value, sport: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Campus / Course</Label>
          <Input
            value={value.campus ?? ""}
            onChange={(e) => onChange({ ...value, campus: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Emergency contact</Label>
          <Input
            value={value.emergencyContact ?? ""}
            onChange={(e) =>
              onChange({ ...value, emergencyContact: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={value.phone ?? ""}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Height</Label>
          <Input
            value={physical.height ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                physical: { ...physical, height: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Weight</Label>
          <Input
            value={physical.weight ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                physical: { ...physical, weight: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Blood pressure</Label>
          <Input
            value={physical.bloodPressure ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                physical: { ...physical, bloodPressure: e.target.value },
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Medical history details</Label>
        <Textarea
          rows={3}
          value={value.historyDetails ?? ""}
          onChange={(e) =>
            onChange({ ...value, historyDetails: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Clearance status</Label>
        <Select
          value={value.clearanceStatus}
          onValueChange={(clearanceStatus) => {
            if (!clearanceStatus) return
            onChange({ ...value, clearanceStatus })
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NFG_CLEARANCE_STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Restrictions</Label>
        <Textarea
          rows={2}
          value={value.restrictions ?? ""}
          onChange={(e) =>
            onChange({ ...value, restrictions: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Recommendations</Label>
        <Textarea
          rows={2}
          value={value.recommendations ?? ""}
          onChange={(e) =>
            onChange({ ...value, recommendations: e.target.value })
          }
        />
      </div>
    </div>
  )
}
