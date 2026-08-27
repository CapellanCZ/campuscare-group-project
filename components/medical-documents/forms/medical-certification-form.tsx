"use client"

import {
  CERTIFICATION_PURPOSE_CATEGORIES,
  CERTIFICATION_STATUS_OPTIONS,
} from "@/features/medical-documents/lib/document-labels"
import type { MedicalCertificationPayload } from "@/types/medicalDocument"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function MedicalCertificationForm({
  value,
  onChange,
}: {
  value: MedicalCertificationPayload
  onChange: (value: MedicalCertificationPayload) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Purpose category</Label>
        <Select
          value={value.purposeCategory}
          onValueChange={(purposeCategory) => {
            if (!purposeCategory) return
            onChange({ ...value, purposeCategory })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select purpose" />
          </SelectTrigger>
          <SelectContent>
            {CERTIFICATION_PURPOSE_CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.purposeCategory === "others" ? (
        <div className="space-y-2">
          <Label htmlFor="purpose-other">Specify purpose</Label>
          <Input
            id="purpose-other"
            value={value.purposeOther ?? ""}
            onChange={(e) =>
              onChange({ ...value, purposeOther: e.target.value })
            }
            placeholder="Describe the purpose"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="exam-date">Date of examination</Label>
        <Input
          id="exam-date"
          type="date"
          value={value.dateOfExamination ?? ""}
          onChange={(e) =>
            onChange({ ...value, dateOfExamination: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Certification status</Label>
        <Select
          value={value.certificationStatus}
          onValueChange={(certificationStatus) => {
            if (!certificationStatus) return
            onChange({ ...value, certificationStatus })
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CERTIFICATION_STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.certificationStatus === "special_placement" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="treatment-suggested">Suggests treatment for</Label>
            <Input
              id="treatment-suggested"
              value={value.treatmentSuggested ?? ""}
              onChange={(e) =>
                onChange({ ...value, treatmentSuggested: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="treatment-optional">Treatment optional for</Label>
            <Input
              id="treatment-optional"
              value={value.treatmentOptional ?? ""}
              onChange={(e) =>
                onChange({ ...value, treatmentOptional: e.target.value })
              }
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
