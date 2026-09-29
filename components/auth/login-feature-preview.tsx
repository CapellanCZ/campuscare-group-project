import type { ReactElement, ReactNode } from "react"

import type { LoginFeatureSlideId } from "@/lib/auth/login-feature-slides"
import { cn } from "@/lib/utils"

function MockChrome({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg ring-1 ring-foreground/5">
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="size-2 rounded-full bg-red-400/80" aria-hidden />
        <span className="size-2 rounded-full bg-amber-400/80" aria-hidden />
        <span className="size-2 rounded-full bg-emerald-400/80" aria-hidden />
        <span className="ml-2 text-[10px] font-medium text-muted-foreground">
          CampusCare
        </span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  )
}

function PreviewConsultations() {
  return (
    <MockChrome>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">
            Consultation requests
          </p>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Pending
          </span>
        </div>
        {[
          { name: "A. Santos", type: "Medical", status: "Awaiting review" },
          { name: "M. Cruz", type: "Dental", status: "Approved" },
        ].map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{row.name}</p>
              <p className="text-[10px] text-muted-foreground">{row.type}</p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </MockChrome>
  )
}

function PreviewQueue() {
  return (
    <MockChrome>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Waiting", value: "12" },
          { label: "Nurse", value: "3" },
          { label: "Physician", value: "2" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border/60 bg-background px-2 py-3"
          >
            <p className="text-lg font-semibold tabular-nums text-primary">
              {item.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {["A-014 · Intake", "A-015 · Physician"].map((t) => (
          <div
            key={t}
            className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] font-medium"
          >
            {t}
          </div>
        ))}
      </div>
    </MockChrome>
  )
}

function PreviewPatientRecords() {
  return (
    <MockChrome>
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          JD
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-xs font-semibold">Jamie Dela Cruz</p>
            <p className="text-[10px] text-muted-foreground">Student · 2026-045210</p>
          </div>
          <ul className="space-y-1 text-[10px] text-muted-foreground">
            <li>Last visit · Mar 12, 2026</li>
            <li>Documents · 2 on file</li>
          </ul>
        </div>
      </div>
    </MockChrome>
  )
}

function PreviewMedicalConsultation() {
  return (
    <MockChrome>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "BP", value: "118/76" },
          { label: "HR", value: "72" },
          { label: "Temp", value: "36.8°C" },
          { label: "SpO₂", value: "98%" },
        ].map((v) => (
          <div
            key={v.label}
            className="rounded-lg border border-border/60 bg-background px-2 py-2"
          >
            <p className="text-[10px] text-muted-foreground">{v.label}</p>
            <p className="text-xs font-semibold tabular-nums">{v.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Assessment · Upper respiratory symptoms
      </p>
    </MockChrome>
  )
}

function PreviewMedicalDocuments() {
  return (
    <MockChrome>
      <div className="space-y-2">
        {[
          { doc: "Prescription", no: "RX-2026-0042", status: "Issued" },
          { doc: "Medical certificate", no: "MC-2026-0018", status: "Issued" },
        ].map((row) => (
          <div
            key={row.no}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium">{row.doc}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {row.no}
              </p>
            </div>
            <span className="text-[10px] font-medium text-primary">
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </MockChrome>
  )
}

function PreviewReports() {
  return (
    <MockChrome>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Consultations", value: "248" },
          { label: "Health cases", value: "36" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border/60 bg-background px-2 py-2"
          >
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            <p className="text-sm font-semibold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-16 items-end gap-1 rounded-lg bg-muted/40 px-2 pb-2 pt-4">
        {[40, 65, 45, 80, 55, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/60"
            style={{ height: `${h}%` }}
            aria-hidden
          />
        ))}
      </div>
    </MockChrome>
  )
}

function PreviewQueueDisplay() {
  return (
    <MockChrome>
      <div className="space-y-3 text-center">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Now serving
        </p>
        <p className="text-3xl font-bold tabular-nums text-primary">A-014</p>
        <p className="text-xs text-muted-foreground">Physician station</p>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11px]">
          Next · A-015, A-016
        </div>
      </div>
    </MockChrome>
  )
}

const PREVIEW_MAP: Record<LoginFeatureSlideId, () => ReactElement> = {
  consultations: PreviewConsultations,
  queue: PreviewQueue,
  "patient-records": PreviewPatientRecords,
  "medical-consultations": PreviewMedicalConsultation,
  "medical-documents": PreviewMedicalDocuments,
  reports: PreviewReports,
  "queue-display": PreviewQueueDisplay,
}

export function LoginFeaturePreview({
  slideId,
  className,
}: {
  slideId: LoginFeatureSlideId
  className?: string
}) {
  const Preview = PREVIEW_MAP[slideId]
  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Preview />
    </div>
  )
}
