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
import { selectItemsRecord } from "@/lib/ui/select-label"

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
          items={selectItemsRecord(CERTIFICATION_PURPOSE_CATEGORIES)}
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
          items={selectItemsRecord(CERTIFICATION_STATUS_OPTIONS)}
          onValueChange={(certificationStatus) => {
            if (!certificationStatus) return
            onChange({ ...value, certificationStatus })
          }}
        >
          <SelectTrigger className="h-auto min-h-9 w-full max-w-full whitespace-normal text-left text-foreground *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:text-foreground">
            <SelectValue placeholder="Select certification status" />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="start"
            className="w-max min-w-[20rem] max-w-[min(36rem,90vw)] text-popover-foreground"
          >
            {CERTIFICATION_STATUS_OPTIONS.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className="whitespace-normal"
              >
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
