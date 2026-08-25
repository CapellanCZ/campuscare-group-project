"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatVitalsLine,
  hasRecordedVitals,
} from "@/components/queue/vitals-strip"
import type { PatientVitalsRecord } from "@/lib/health/types"
import { ticketLabel } from "@/lib/health/mappers"

function formatRecordedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
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
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vital-sign records</DialogTitle>
          <DialogDescription>
            {patientName
              ? `Previous vitals for ${patientName}.`
              : "Previous vitals from completed intakes."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading records…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No previous vital-sign records for this patient.
          </p>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => {
              const line = formatVitalsLine(record.vitals)
              return (
                <li
                  key={record.ticketId}
                  className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium tabular-nums">
                      {ticketLabel(record.queueNumber, record.ticketCode)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRecordedAt(record.recordedAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {hasRecordedVitals(record.vitals) && line
                      ? line
                      : "No vitals recorded"}
                  </p>
                  {record.chiefComplaint?.trim() ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {record.chiefComplaint}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
