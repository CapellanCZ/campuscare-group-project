"use client"

import { IconHeartbeat } from "@tabler/icons-react"

import {
  formatBloodPressure,
  hasRecordedVitals,
} from "@/components/queue/vitals-strip"
import type { PatientVitalsRecord, QueueVitals } from "@/lib/health/types"
import { ticketLabel } from "@/lib/health/mappers"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function formatRecordedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function VitalChip({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  if (!value) return null
  return (
    <div className="min-w-0 rounded-md border bg-background px-2 py-1.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

function vitalsChips(vitals: QueueVitals) {
  return [
    { label: "BP", value: formatBloodPressure(vitals) },
    {
      label: "HR",
      value: vitals.heartRate != null ? `${vitals.heartRate}` : null,
    },
    {
      label: "Temp",
      value:
        vitals.temperatureC != null ? `${vitals.temperatureC}°C` : null,
    },
    {
      label: "SpO₂",
      value: vitals.spo2 != null ? `${vitals.spo2}%` : null,
    },
    {
      label: "RR",
      value:
        vitals.respiratoryRate != null
          ? String(vitals.respiratoryRate)
          : null,
    },
    {
      label: "Wt",
      value: vitals.weightKg != null ? `${vitals.weightKg} kg` : null,
    },
    {
      label: "Ht",
      value: vitals.heightCm != null ? `${vitals.heightCm} cm` : null,
    },
  ]
}

function RecordCard({ record }: { record: PatientVitalsRecord }) {
  const chips = hasRecordedVitals(record.vitals)
    ? vitalsChips(record.vitals).filter((chip) => chip.value)
    : []

  return (
    <li className="rounded-xl border bg-muted/20 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold tabular-nums">
          {ticketLabel(record.queueNumber, record.ticketCode)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatRecordedAt(record.recordedAt)}
        </p>
      </div>
      {record.chiefComplaint?.trim() ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {record.chiefComplaint}
        </p>
      ) : null}
      {chips.length > 0 ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {chips.map((chip) => (
            <VitalChip key={chip.label} label={chip.label} value={chip.value} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No vitals recorded for this visit.
        </p>
      )}
    </li>
  )
}

export function VitalsHistoryDialog({
  open,
  onOpenChange,
  patientName,
  records,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName?: string | null
  records: PatientVitalsRecord[]
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="gap-1.5 border-b px-5 py-4 text-left sm:px-6">
          <DialogTitle className="leading-none">Vital records</DialogTitle>
          <DialogDescription className="text-xs">
            {patientName
              ? `Prior intakes for ${patientName}`
              : "Prior vitals from completed intakes"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading records…</p>
          ) : records.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center"
              )}
            >
              <div className="flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground">
                <IconHeartbeat className="size-4" stroke={1.75} aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">
                No prior vitals
              </p>
              <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                Nothing on file yet. Values you save on this visit become the
                next reference.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {records.map((record) => (
                <RecordCard key={record.ticketId} record={record} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
