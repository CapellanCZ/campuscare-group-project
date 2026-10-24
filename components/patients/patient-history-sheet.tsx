"use client"

import { useEffect, useMemo, useState } from "react"
import {
  IconChevronRight,
  IconDental,
  IconFileText,
  IconHistory,
  IconStethoscope,
} from "@tabler/icons-react"

import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import { documentTypeLabel } from "@/components/medical-documents/document-print-view"
import {
  documentStatusLabel,
  documentStatusToneKey,
} from "@/features/medical-documents/lib/document-status"
import {
  getCachedPatientHistory,
  loadPatientHistoryBundle,
  type PatientHistoryEntry,
} from "@/features/patients/lib/prefetch-patient-history"
import type { ClinicalRecordScope } from "@/lib/clinical/record-scope"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  consultationStatusDot,
  consultationStatusTone,
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
} from "@/lib/ui/status-badge-tone"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { appToast } from "@/lib/feedback/app-toast"
import type { Consultation } from "@/types/consultation"
import { consultationStatusLabel } from "@/types/consultation"
import type { MedicalDocument } from "@/types/medicalDocument"
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"
import { PatientVisitDetailDialog } from "@/components/patients/patient-visit-detail-dialog"
import { DentalChartPreviewDialog } from "@/components/patients/dental-chart-preview-dialog"
import { consultationHistoryPreview } from "@/components/consultations/consultation-summary-content"
import { cn } from "@/lib/utils"

type HistoryFilter = "all" | "visits" | "reports"

function formatHistoryDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed))
}

function stripRequestPrefix(value: string) {
  return value.replace(/^consultation request:\s*/i, "").trim()
}

function isRequestShapedLabel(value: string) {
  return /^consultation request:/i.test(value.trim())
}

/** Prefer clinical content; avoid request boilerplate as the row title. */
function visitHistoryTitle(row: Consultation, dentalOnly: boolean): string {
  const diagnosis = row.diagnosis?.trim()
  const complaint = row.chiefComplaint?.trim()

  if (diagnosis && !isRequestShapedLabel(diagnosis)) return diagnosis
  if (complaint && !isRequestShapedLabel(complaint)) return complaint

  const fromRequest = stripRequestPrefix(diagnosis || complaint || "")
  if (fromRequest && !/^dental consultation$/i.test(fromRequest)) {
    return fromRequest
  }

  const station = (row.station ?? "").toLowerCase()
  if (dentalOnly || station === "dentist") return "Dental visit"
  if (station === "physician") return "Physician visit"
  if (station === "nurse") return "Nurse visit"
  return "Consultation"
}

function visitPreviewLines(row: Consultation, title: string): string[] {
  const titleNorm = title.trim().toLowerCase()
  return consultationHistoryPreview(row)
    .map((line) => {
      const match = line.match(
        /^(Chief complaint|Symptoms|Diagnosis|Treatment|Prescription):\s*(.+)$/i
      )
      if (!match) return null
      const label = match[1]
      const body = match[2]?.trim() ?? ""
      if (!body) return null
      if (body.toLowerCase() === titleNorm) return null
      if (isRequestShapedLabel(body)) {
        const stripped = stripRequestPrefix(body)
        if (!stripped || stripped.toLowerCase() === titleNorm) return null
        // Request-shaped complaint that only restates the visit type — skip.
        if (/^(dental|physician|nurse)\s+consultation$/i.test(stripped)) {
          return null
        }
        return `${label}: ${stripped}`
      }
      return line
    })
    .filter((line): line is string => Boolean(line))
    .slice(0, 2)
}

function visitKindMeta(row: Consultation, dentalOnly: boolean) {
  const station = (row.station ?? "").toLowerCase()
  if (dentalOnly || station === "dentist") {
    return { label: "Dental", Icon: IconDental }
  }
  if (station === "physician") {
    return { label: "Physician", Icon: IconStethoscope }
  }
  if (station === "nurse") {
    return { label: "Nurse", Icon: IconStethoscope }
  }
  return { label: "Visit", Icon: IconStethoscope }
}

function HistoryFilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
      <span
        className={cn(
          "tabular-nums",
          active ? "text-background/70" : "text-muted-foreground/80"
        )}
      >
        {count}
      </span>
    </button>
  )
}

export function PatientHistorySheet({
  patient,
  open,
  onOpenChange,
  stationFilter,
  documentScope = "all",
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  stationFilter?: "dentist" | "physician" | "nurse" | "all"
  documentScope?: ClinicalRecordScope
}) {
  const station = stationFilter ?? "all"
  const cached =
    patient != null
      ? getCachedPatientHistory(patient, station, documentScope)
      : null
  const [entries, setEntries] = useState<PatientHistoryEntry[]>(
    () => cached?.entries ?? []
  )
  const [loading, setLoading] = useState(() => !cached)
  const [filter, setFilter] = useState<HistoryFilter>("all")
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [preview, setPreview] = useState<MedicalDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [chartPreviewId, setChartPreviewId] = useState<string | null>(null)
  const [chartPreviewOpen, setChartPreviewOpen] = useState(false)
  const dentalOnly = stationFilter === "dentist"

  useEffect(() => {
    if (!open || !patient) return
    let cancelled = false
    const hit = getCachedPatientHistory(patient, station, documentScope)
    if (hit) {
      setEntries(hit.entries)
      setLoading(false)
    } else {
      setLoading(true)
    }

    void loadPatientHistoryBundle(patient, station, documentScope)
      .then((bundle) => {
        if (cancelled) return
        setEntries(bundle.entries)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoading(false)
        if (!hit) setEntries([])
        appToast.error({
          title: "Unable to Load History",
          description:
            error instanceof Error
              ? error.message
              : "Could not load patient history.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [documentScope, open, patient, station])

  useEffect(() => {
    if (open) setFilter("all")
  }, [open, patient?.id])

  const visitCount = useMemo(
    () => entries.filter((entry) => entry.kind === "consultation").length,
    [entries]
  )
  const reportCount = useMemo(
    () => entries.filter((entry) => entry.kind === "report").length,
    [entries]
  )
  const showFilters = visitCount > 0 && reportCount > 0

  const visibleEntries = useMemo(() => {
    if (filter === "visits") {
      return entries.filter((entry) => entry.kind === "consultation")
    }
    if (filter === "reports") {
      return entries.filter((entry) => entry.kind === "report")
    }
    return entries
  }, [entries, filter])

  const showSkeleton = loading && entries.length === 0

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) {
            setDetailOpen(false)
            setSelected(null)
            setPreviewOpen(false)
            setPreview(null)
            setChartPreviewOpen(false)
            setChartPreviewId(null)
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="gap-1 border-b px-5 py-4 text-left sm:px-6">
            <DialogTitle className="pr-8">Patient history</DialogTitle>
            <DialogDescription className="text-pretty">
              {patient
                ? `${patientFullName(patient)} · visits and issued reports`
                : "Visits and issued reports"}
            </DialogDescription>
            {!showSkeleton && entries.length > 0 ? (
              <p className="pt-1 text-xs text-muted-foreground">
                {entries.length} record{entries.length === 1 ? "" : "s"}
                {showFilters
                  ? ` · ${visitCount} visit${visitCount === 1 ? "" : "s"}, ${reportCount} report${reportCount === 1 ? "" : "s"}`
                  : null}
              </p>
            ) : null}
          </DialogHeader>

          {showFilters ? (
            <div className="flex flex-wrap gap-1.5 border-b px-5 py-2.5 sm:px-6">
              <HistoryFilterChip
                active={filter === "all"}
                label="All"
                count={entries.length}
                onClick={() => setFilter("all")}
              />
              <HistoryFilterChip
                active={filter === "visits"}
                label="Visits"
                count={visitCount}
                onClick={() => setFilter("visits")}
              />
              <HistoryFilterChip
                active={filter === "reports"}
                label="Reports"
                count={reportCount}
                onClick={() => setFilter("reports")}
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {showSkeleton ? (
              <div className="space-y-2 px-5 py-4 sm:px-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <Empty className="min-h-[14rem] border-0 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconHistory aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>No history yet</EmptyTitle>
                  <EmptyDescription>
                    Consultations and issued reports for this patient will show
                    up here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : visibleEntries.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">
                No {filter === "visits" ? "visits" : "reports"} in this history.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {visibleEntries.map((entry) => {
                  if (entry.kind === "report") {
                    const row = entry.row
                    return (
                      <li key={`report-${row.id}`}>
                        <button
                          type="button"
                          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-6"
                          onClick={() => {
                            setPreview(row)
                            setPreviewOpen(true)
                          }}
                        >
                          <span
                            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                            aria-hidden
                          >
                            <IconFileText className="size-4" stroke={1.75} />
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                  Report
                                </span>
                                <span className="mt-0.5 block text-sm font-medium text-foreground">
                                  {documentTypeLabel(row)}
                                </span>
                              </span>
                              {row.status ? (
                                <StatusBadge
                                  className="shrink-0"
                                  label={documentStatusLabel(row.status)}
                                  toneClassName={
                                    STATUS_BADGE_TONE[
                                      documentStatusToneKey(row.status)
                                    ]
                                  }
                                  dotClassName={
                                    STATUS_BADGE_DOT[
                                      documentStatusToneKey(row.status)
                                    ]
                                  }
                                />
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatHistoryDate(entry.date)}
                              {row.documentNumber
                                ? ` · ${row.documentNumber}`
                                : ""}
                            </span>
                          </span>
                          <IconChevronRight
                            className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
                            stroke={1.75}
                            aria-hidden
                          />
                        </button>
                      </li>
                    )
                  }

                  const row = entry.row
                  const chartMatch = row.notes?.match(
                    /dental_appointment_id=([0-9a-f-]{36})/i
                  )
                  const chartAppointmentId = chartMatch?.[1] ?? null
                  const title = visitHistoryTitle(row, dentalOnly)
                  const summaryLines = visitPreviewLines(row, title)
                  const kind = visitKindMeta(row, dentalOnly)
                  const KindIcon = kind.Icon
                  const waitingStronger =
                    row.status === "waiting"
                      ? "border-border bg-muted text-foreground"
                      : consultationStatusTone(row.status)

                  return (
                    <li key={`consultation-${row.id}`}>
                      <div className="group">
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-6"
                          onClick={() => {
                            setSelected(row)
                            setDetailOpen(true)
                          }}
                        >
                          <span
                            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                            aria-hidden
                          >
                            <KindIcon className="size-4" stroke={1.75} />
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                  {kind.label}
                                </span>
                                <span className="mt-0.5 block text-sm font-medium text-foreground">
                                  {title}
                                </span>
                              </span>
                              <StatusBadge
                                className="shrink-0"
                                label={consultationStatusLabel(row.status)}
                                toneClassName={waitingStronger}
                                dotClassName={
                                  row.status === "waiting"
                                    ? "bg-foreground/55"
                                    : consultationStatusDot(row.status)
                                }
                              />
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatHistoryDate(entry.date)}
                              {row.providerName
                                ? ` · ${dentalOnly ? "Dentist" : "Provider"}: ${row.providerName}`
                                : ""}
                            </span>
                            {summaryLines.length > 0 ? (
                              <span className="block space-y-0.5 pt-0.5">
                                {summaryLines.map((line) => (
                                  <span
                                    key={line}
                                    className="block text-xs leading-relaxed text-muted-foreground line-clamp-1"
                                  >
                                    {line}
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </span>
                          <IconChevronRight
                            className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
                            stroke={1.75}
                            aria-hidden
                          />
                        </button>
                        {chartAppointmentId && dentalOnly ? (
                          <div className="border-t border-border/40 bg-muted/20 px-5 py-2 pl-[3.75rem] sm:px-6 sm:pl-[4rem]">
                            <button
                              type="button"
                              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                              onClick={() => {
                                setChartPreviewId(chartAppointmentId)
                                setChartPreviewOpen(true)
                              }}
                            >
                              Preview dental chart
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {!showSkeleton && visibleEntries.length > 0 ? (
            <p className="border-t px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
              Select a row to open details
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <PatientVisitDetailDialog
        consultation={selected}
        patient={patient}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <DocumentPreviewDialog
        document={preview}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <DentalChartPreviewDialog
        appointmentId={chartPreviewId}
        open={chartPreviewOpen}
        onOpenChange={setChartPreviewOpen}
      />
    </>
  )
}
