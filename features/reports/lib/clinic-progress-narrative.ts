import type {
  ReportChartSeries,
  ReportKpi,
  ReportTableBundle,
} from "@/features/reports/types"

export type ClinicProgressNarrative = {
  title: string
  periodLabel: string
  executiveSummary: string
  operationalProgress: string
  healthConcerns: string
  serviceCapacity: string
  closing: string
}

function kpiValue(kpis: ReportKpi[], keyPart: string): string | null {
  const hit = kpis.find((k) => k.key.includes(keyPart) || k.key === keyPart)
  return hit?.value ?? null
}

function topLabels(series: ReportChartSeries | undefined, n = 3): string {
  if (!series || series.points.length === 0) return "no dominant pattern recorded"
  return series.points
    .slice(0, n)
    .map((p) => `${p.label} (${p.value})`)
    .join("; ")
}

export function buildClinicProgressNarrative(input: {
  dateFrom: string
  dateTo: string
  roleLabel: string
  kpis: ReportKpi[]
  charts: ReportChartSeries[]
  scope?: "medical" | "dental" | "hso"
}): ClinicProgressNarrative {
  const periodLabel = `${input.dateFrom} to ${input.dateTo}`
  const complaints = input.charts.find(
    (c) =>
      c.key === "common_health_complaints" ||
      c.key === "common_diagnoses" ||
      c.key === "common_dental_cases" ||
      c.key === "health_cases"
  )
  const dental = input.charts.find((c) => c.key === "common_dental_cases")
  const patientMix = input.charts.find(
    (c) => c.key === "patient_type_distribution"
  )
  const queue = input.charts.find((c) => c.key === "queue_performance")
  const trend = input.charts.find(
    (c) =>
      c.key === "monthly_consult_trend" ||
      c.key === "consultation_trend" ||
      c.key === "dental_consult_trend" ||
      c.key === "daily_patient_volume" ||
      c.key === "consult_volume_trend"
  )

  const total =
    kpiValue(input.kpis, "total_consultations") ??
    kpiValue(input.kpis, "consultations_today") ??
    kpiValue(input.kpis, "dental_consultations_today") ??
    kpiValue(input.kpis, "patients_served") ??
    "—"
  const patients =
    kpiValue(input.kpis, "patients_served") ??
    kpiValue(input.kpis, "patients_treated") ??
    kpiValue(input.kpis, "patients_served_today") ??
    "—"
  const certs =
    kpiValue(input.kpis, "certs_issued") ??
    kpiValue(input.kpis, "dental_certs_issued") ??
    "—"
  const wait = kpiValue(input.kpis, "avg_wait") ?? "—"
  const walkIns = kpiValue(input.kpis, "walk_ins")
  const pending = kpiValue(input.kpis, "pending_requests")

  const executiveSummary = [
    `This Health Service Office progress report covers ${periodLabel} and was prepared for administrative review of overall clinic operations and health-related concerns.`,
    `During the period, CampusCare recorded approximately ${total} consultation-related activity and served about ${patients} patients, with ${certs} medical/dental certificates reflected in the analytics summary.`,
    `Average waiting time stands at ${wait}. ${
      walkIns ? `Walk-in volume is reported at ${walkIns}. ` : ""
    }${
      pending
        ? `Pending consultation requests currently stand at ${pending}. `
        : ""
    }The figures below summarize clinic progress for ${input.roleLabel} oversight.`,
  ].join(" ")

  const operationalProgress = [
    `Operational trend (${trend?.title ?? "consultation volume"}): ${
      trend && trend.points.length
        ? `recent points show ${trend.points
            .slice(-4)
            .map((p) => `${p.label}=${p.value}`)
            .join(", ")}.`
        : "insufficient trend points in the selected filters."
    }`,
    patientMix
      ? `Patient composition: ${topLabels(patientMix, 4)}.`
      : "Patient composition charts were not included for this role view.",
    `Certificates and completed encounters remain key throughput indicators for HSO quarterly reporting to administration.`,
  ].join(" ")

  const healthConcerns = [
    `Leading health-related findings in this period: ${topLabels(complaints, 5)}.`,
    input.scope === "medical"
      ? "Dental case patterns are excluded from this medical report."
      : input.scope === "dental"
        ? "Medical case patterns are excluded from this dental report."
        : dental && dental.key !== complaints?.key
          ? `Dental case pattern: ${topLabels(dental, 4)}.`
          : "Dental and medical concern patterns should be monitored for seasonal spikes and clearance demand.",
    `These concerns guide staffing, inventory of common remedies, and health education priorities for the next quarter.`,
  ].join(" ")

  const serviceCapacity = [
    queue
      ? `Queue performance (${queue.title}): ${topLabels(queue, 5)}. Higher wait values indicate pressure points for triage and station handoff.`
      : `Service capacity is reflected in average wait (${wait}) and daily/periodic consultation volume.`,
    `Sustained elevated wait times or request backlogs warrant process review with nursing intake and specialty stations.`,
  ].join(" ")

  const closing = `This document consolidates analytics cards, charts, and report tables for the selected period so the Health Service Office can brief administration on clinic progress, patient demand, and priority health concerns. Retain with quarterly HSO submissions.`

  const title =
    input.scope === "medical"
      ? "Medical Consultation & Health Cases Report"
      : input.scope === "dental"
        ? "Dental Consultation & Health Cases Report"
        : "HSO Clinic Progress & Health Situation Report"

  return {
    title,
    periodLabel,
    executiveSummary,
    operationalProgress,
    healthConcerns,
    serviceCapacity,
    closing,
  }
}

export type ClinicExportPack = {
  narrative: ClinicProgressNarrative
  kpis: ReportKpi[]
  charts: ReportChartSeries[]
  tables: ReportTableBundle[]
}
