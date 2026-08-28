"use client"

import { useEffect, useState } from "react"

import { DentalPatientChartForm } from "@/features/dentist/components/dental-patient-chart"
import { fetchDentalChartPreviewAction } from "@/features/patients/actions"
import type { DentalPatientChart } from "@/features/dentist/types/dental-chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { appToast } from "@/lib/feedback/app-toast"

export function DentalChartPreviewDialog({
  appointmentId,
  open,
  onOpenChange,
}: {
  appointmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [chart, setChart] = useState<DentalPatientChart | null>(null)
  const [patientName, setPatientName] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !appointmentId) {
      setChart(null)
      setPatientName(null)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchDentalChartPreviewAction(appointmentId).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        appToast.error({
          title: "Unable to Load Dental Chart",
          description: result.error,
        })
        return
      }
      setChart(result.data.chart)
      setPatientName(result.data.patientName)
    })

    return () => {
      cancelled = true
    }
  }, [appointmentId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Dental patient chart</DialogTitle>
          <DialogDescription>
            {patientName
              ? `Read-only preview for ${patientName}.`
              : "Read-only dental chart preview."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <Skeleton className="m-6 h-96 w-[calc(100%-3rem)]" />
          ) : chart ? (
            <DentalPatientChartForm
              chart={chart}
              onChange={setChart}
              activeCode={null}
              selectedTooth={null}
              onSelectTooth={() => {}}
              onSelectCode={() => {}}
              readOnly
            />
          ) : (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No dental chart is available for this visit.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
