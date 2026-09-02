import { catalogFor } from "@/features/reports/role-catalog"
import { reportPatientTypeLabel, reportPatientClass } from "@/features/reports/lib/patient-type-label"
import { normalizeHealthCase, rankHealthCases } from "@/features/reports/lib/health-case-normalize"
import { resolveReportPeriod, listPeriodDays } from "@/features/reports/lib/report-period"
import {
  filterConsults,
  inDateRange,
  toTableRowsFromConsults,
  type ReportsDataset,
  type SeedCertRow,
  type SeedConsultRow,
  type SeedQueueDay,
  type SeedRequestRow,
} from "@/features/reports/data/datasets"
import type {
  ReportChartSeries,
  ReportFilters,
  ReportKind,
  ReportKpi,
  ReportKpiKey,
  ReportTableBundle,
  ReportTableColumn,
  ReportTableRow,
  ReportsBundle,
} from "@/features/reports/types"
import { REPORT_KIND_LABELS } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

export type ReportsLiveMetrics = {
  completedToday: number
  walkIns: number
  avgWait: number
  pendingRequests: number
  certsToday: number
}

const EMPTY_DATASET: ReportsDataset = {
  consults: [],
  certs: [],
  requests: [],
  queueDays: [],
}

const EMPTY_LIVE: ReportsLiveMetrics = {
  completedToday: 0,
  walkIns: 0,
  avgWait: 0,
  pendingRequests: 0,
  certsToday: 0,
}

export function defaultFiltersFor(
  designation: ClinicDesignation
): ReportFilters {
  const catalog = catalogFor(designation)
  const range = resolveReportPeriod("this_month")
  return {
    reportPeriod: "this_month",
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    consultationType: catalog.defaultConsultationType,
    patientType: "all",
    assignedPersonnel: "all",
    status: "all",
    reportKind: catalog.reportKinds[0] ?? "daily_consultation",
    query: "",
  }
}

function countBy(
  items: string[]
): Array<{ label: string; value: number }> {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function searchRows(rows: ReportTableRow[], query: string): ReportTableRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    Object.values(row.cells).some((v) => String(v).toLowerCase().includes(q))
  )
}

function filterCerts(
  rows: SeedCertRow[],
  filters: ReportFilters
): SeedCertRow[] {
  return rows.filter((row) => {
    if (!inDateRange(row.date, filters.dateFrom, filters.dateTo)) return false
    if (
      filters.consultationType !== "all" &&
      row.consultationType !== filters.consultationType
    )
      return false
    if (filters.patientType !== "all" && row.patientType !== filters.patientType)
      return false
    if (
      filters.assignedPersonnel !== "all" &&
      row.doctorName !== filters.assignedPersonnel
    )
      return false
    if (filters.status !== "all" && row.status !== filters.status) return false
    return true
  })
}

function filterRequests(
  rows: SeedRequestRow[],
  filters: ReportFilters
): SeedRequestRow[] {
  return rows.filter((row) => {
    if (!inDateRange(row.submittedAt, filters.dateFrom, filters.dateTo))
      return false
    if (filters.patientType !== "all" && row.patientType !== filters.patientType)
      return false
    if (
      filters.assignedPersonnel !== "all" &&
      row.assignedPersonnel !== filters.assignedPersonnel
    )
      return false
    if (filters.status !== "all" && row.status !== filters.status) return false
    return true
  })
}

function filterQueue(
  rows: SeedQueueDay[],
  filters: ReportFilters
): SeedQueueDay[] {
  return rows.filter((row) =>
    inDateRange(row.date, filters.dateFrom, filters.dateTo)
  )
}

function buildKpis(
  keys: ReportKpiKey[],
  consults: SeedConsultRow[],
  certs: SeedCertRow[],
  requests: SeedRequestRow[],
  live: {
    completedToday: number
    walkIns: number
    avgWait: number
    pendingRequests: number
    certsToday: number
  },
  designation: ClinicDesignation
): ReportKpi[] {
  const completed = consults.filter(
    (c) => c.status.toLowerCase() === "completed"
  )
  const medical = consults.filter((c) => c.consultationType === "medical")
  const dental = consults.filter((c) => c.consultationType === "dental")
  const issuedCerts = certs.filter((c) => {
    const status = c.status.toLowerCase()
    return status === "issued" || status === "printed"
  })
  const dentalCerts = issuedCerts.filter((c) => c.consultationType === "dental")
  const todayYmd = new Date().toISOString().slice(0, 10)

  const map: Record<ReportKpiKey, ReportKpi> = {
    total_consultations: {
      key: "total_consultations",
      label: "Total consultations",
      value: String(consults.length),
      description: "In selected range",
    },
    patients_served: {
      key: "patients_served",
      label: "Patients served",
      value: String(new Set(completed.map((c) => c.campusId)).size),
      description: "Unique patients",
    },
    certs_issued: {
      key: "certs_issued",
      label: "Medical certificates issued",
      value: String(
        issuedCerts.filter((c) => c.consultationType === "medical").length
      ),
      description: "Issued in range",
    },
    avg_wait: {
      key: "avg_wait",
      label: "Average Waiting Time",
      value: `${avg(consults.map((c) => c.waitMinutes).filter((n) => n > 0)) || live.avgWait} min`,
      description: "Minutes",
    },
    patients_served_today: {
      key: "patients_served_today",
      label: "Patients served today",
      value: String(
        completed.filter((c) => c.date === todayYmd).length ||
          live.completedToday
      ),
    },
    pending_requests: {
      key: "pending_requests",
      label: "Pending consultation requests",
      value: String(
        requests.filter((r) => r.status.toLowerCase() === "pending").length ||
          live.pendingRequests
      ),
    },
    walk_ins: {
      key: "walk_ins",
      label: "Walk-in patients",
      value: String(
        consults.filter((c) => c.walkIn).length || live.walkIns
      ),
    },
    consultations_today: {
      key: "consultations_today",
      label: "Consultations today",
      value: String(
        medical.filter((c) => c.date === todayYmd).length || live.completedToday
      ),
    },
    patients_treated: {
      key: "patients_treated",
      label: "Patients Treated",
      value: String(new Set(completed.map((c) => c.campusId)).size),
    },
    completed_consultations: {
      key: "completed_consultations",
      label:
        designation === "dentist"
          ? "Completed Dental Consultations"
          : "Completed Consultations",
      value: String(completed.length),
    },
    dental_consultations_today: {
      key: "dental_consultations_today",
      label: "Dental consultations today",
      value: String(dental.filter((c) => c.date === todayYmd).length),
    },
    dental_certs_issued: {
      key: "dental_certs_issued",
      label: "Dental certificates issued",
      value: String(dentalCerts.length),
    },
    follow_up_cases: {
      key: "follow_up_cases",
      label: "Follow-up Cases",
      value: String(
        consults.filter((c) => Boolean(c.followUpDate?.trim())).length
      ),
    },
    medical_consultations: {
      key: "medical_consultations",
      label: "Medical Consultations",
      value: String(medical.length),
    },
    dental_consultations: {
      key: "dental_consultations",
      label: "Dental Consultations",
      value: String(dental.length),
    },
  }

  return keys.map((key) => map[key])
}

function buildCharts(
  keys: ReportChartSeries["key"][],
  consults: SeedConsultRow[],
  requests: SeedRequestRow[],
  queueDays: SeedQueueDay[],
  dateFrom: string,
  dateTo: string,
  designation: ClinicDesignation
): ReportChartSeries[] {
  const byMonth = countBy(consults.map((c) => c.period)).map((p) => ({
    label: p.label,
    value: p.value,
  }))
  const periodDays = listPeriodDays(dateFrom, dateTo)
  const trendPoints = periodDays.map((ymd) => {
    const dayConsults = consults.filter((row) => row.date === ymd)
    const medical = dayConsults.filter(
      (row) => row.consultationType === "medical"
    ).length
    const dental = dayConsults.filter(
      (row) => row.consultationType === "dental"
    ).length
    return {
      label: ymd.slice(5),
      value: medical,
      secondary: dental,
      tertiary: medical + dental,
    }
  })
  const byDay = countBy(consults.map((c) => c.date))
    .slice(0, 14)
    .reverse()
  const healthComplaints = countBy(
    consults
      .filter((c) => c.consultationType === "medical")
      .map((c) => normalizeHealthCase(c.complaint === "—" ? c.diagnosis : c.complaint, "medical"))
  ).slice(0, 8)
  const dentalCases = countBy(
    consults
      .filter((c) => c.consultationType === "dental")
      .map((c) =>
        normalizeHealthCase(
          c.diagnosis === "—" ? c.complaint : c.diagnosis,
          "dental"
        )
      )
  ).slice(0, 8)
  const diagnoses = countBy(
    consults
      .filter((c) => c.consultationType === "medical")
      .map((c) => c.diagnosis)
      .filter((value) => value && value !== "—")
  ).slice(0, 8)
  const patientTypes = countBy(
    consults
      .map((c) => reportPatientTypeLabel(c.patientType))
      .filter((label) => label === "Student" || label === "Faculty" || label === "Employee")
  )
  const utilization = [
    {
      label: "Student Medical",
      value: consults.filter(
        (c) => c.consultationType === "medical" && reportPatientClass(c.patientType) === "student"
      ).length,
    },
    {
      label: "Student Dental",
      value: consults.filter(
        (c) => c.consultationType === "dental" && reportPatientClass(c.patientType) === "student"
      ).length,
    },
    {
      label: "Faculty Medical",
      value: consults.filter(
        (c) => c.consultationType === "medical" && reportPatientClass(c.patientType) === "faculty"
      ).length,
    },
    {
      label: "Faculty Dental",
      value: consults.filter(
        (c) => c.consultationType === "dental" && reportPatientClass(c.patientType) === "faculty"
      ).length,
    },
    {
      label: "Employee Medical",
      value: consults.filter(
        (c) => c.consultationType === "medical" && reportPatientClass(c.patientType) === "employee"
      ).length,
    },
    {
      label: "Employee Dental",
      value: consults.filter(
        (c) => c.consultationType === "dental" && reportPatientClass(c.patientType) === "employee"
      ).length,
    },
  ].filter((point) => point.value > 0)

  const scopedUtilization =
    designation === "physician"
      ? utilization.filter((point) => point.label.includes("Medical"))
      : designation === "dentist"
        ? utilization.filter((point) => point.label.includes("Dental"))
        : utilization

  const caseBuckets = new Map<
    string,
    { student: number; faculty: number; employee: number; total: number }
  >()
  for (const consult of consults) {
    const label = normalizeHealthCase(
      consult.complaint === "—" ? consult.diagnosis : consult.complaint,
      consult.consultationType
    )
    const bucket = caseBuckets.get(label) ?? {
      student: 0,
      faculty: 0,
      employee: 0,
      total: 0,
    }
    const classified = reportPatientClass(consult.patientType)
    if (classified === "student") bucket.student += 1
    else if (classified === "faculty") bucket.faculty += 1
    else if (classified === "employee") bucket.employee += 1
    bucket.total += 1
    caseBuckets.set(label, bucket)
  }
  const rankedCases = rankHealthCases(
    [...caseBuckets.entries()].map(([label, counts]) => ({
      label,
      ...counts,
    }))
  )
  const queuePerf = queueDays.slice(0, 10).map((q) => ({
    label: q.date.slice(5),
    value: q.avgWaitMinutes,
    secondary: q.served,
  }))
  const requestTrend = countBy(requests.map((r) => r.submittedAt))
    .slice(0, 10)
    .reverse()

  const map: Partial<Record<ReportChartSeries["key"], ReportChartSeries>> = {
    monthly_consult_trend: {
      key: "monthly_consult_trend",
      title: "Monthly consultation trend",
      kind: "line",
      points: byMonth,
    },
    common_health_complaints: {
      key: "common_health_complaints",
      title: "Common Health Cases",
      kind: "hbar",
      points: healthComplaints,
    },
    common_dental_cases: {
      key: "common_dental_cases",
      title: "Common Dental Cases",
      kind: "hbar",
      points: dentalCases,
    },
    patient_type_distribution: {
      key: "patient_type_distribution",
      title: "Patient Service Statistics",
      description: "Student, Faculty, and Employee",
      kind: "pie",
      points: patientTypes,
    },
    queue_performance: {
      key: "queue_performance",
      title: "Queue performance",
      description: "Average wait (min)",
      kind: "line",
      points: queuePerf,
    },
    daily_patient_volume: {
      key: "daily_patient_volume",
      title: "Daily patient volume",
      kind: "bar",
      points: byDay,
    },
    consultation_request_trend: {
      key: "consultation_request_trend",
      title: "Consultation request trend",
      kind: "line",
      points: requestTrend,
    },
    consultation_trend: {
      key: "consultation_trend",
      title: "Medical Consultation Trend",
      kind: "line",
      valueLabel: "Consultations",
      points: trendPoints.map((point) => ({
        label: point.label,
        value: point.value,
      })),
    },
    common_diagnoses: {
      key: "common_diagnoses",
      title: "Common diagnoses",
      kind: "hbar",
      points: diagnoses,
    },
    dental_consult_trend: {
      key: "dental_consult_trend",
      title: "Dental Consultation Trend",
      kind: "line",
      valueLabel: "Consultations",
      points: trendPoints.map((point) => ({
        label: point.label,
        value: point.secondary,
      })),
    },
    consult_volume_trend: {
      key: "consult_volume_trend",
      title: "Consultation Trend",
      kind: "multiline",
      points: trendPoints,
    },
    service_utilization: {
      key: "service_utilization",
      title:
        designation === "physician"
          ? "Medical Service Utilization"
          : designation === "dentist"
            ? "Dental Service Utilization"
            : "Service Utilization",
      kind: "hbar",
      points: scopedUtilization,
    },
    health_cases: {
      key: "health_cases",
      title: "Health Cases",
      kind: "hbar",
      points: rankedCases.map((bucket) => ({
        label: bucket.label,
        value: bucket.total,
      })),
    },
    health_cases_by_patient_type: {
      key: "health_cases_by_patient_type",
      title: "Health Cases by Patient Type",
      kind: "stackedBar",
      points: rankedCases.map((bucket) => ({
        label: bucket.label,
        value: bucket.student,
        secondary: bucket.faculty,
        tertiary: bucket.employee,
      })),
    },
    patient_type_bar: {
      key: "patient_type_bar",
      title: "Patients served by type",
      kind: "bar",
      points: patientTypes,
    },
    medical_dental_donut: {
      key: "medical_dental_donut",
      title: "Medical vs dental",
      kind: "pie",
      points: [
        {
          label: "Medical",
          value: consults.filter((c) => c.consultationType === "medical").length,
        },
        {
          label: "Dental",
          value: consults.filter((c) => c.consultationType === "dental").length,
        },
      ],
    },
  }

  return keys.flatMap((key) => {
    const series = map[key]
    return series ? [series] : []
  })
}

function columnsFor(
  kind: ReportKind,
  aggregateOnly = false,
  designation?: ClinicDesignation
): ReportTableColumn[] {
  if (aggregateOnly) {
    if (kind === "daily_consultation") {
      if (designation === "physician") {
        return [
          { key: "date", label: "Date", sortable: true },
          { key: "medical", label: "Consultations", sortable: true },
          { key: "patients", label: "Patients", sortable: true },
          { key: "avgWait", label: "Avg wait (min)", sortable: true },
        ]
      }
      if (designation === "dentist") {
        return [
          { key: "date", label: "Date", sortable: true },
          { key: "dental", label: "Consultations", sortable: true },
          { key: "patients", label: "Patients", sortable: true },
          { key: "avgWait", label: "Avg wait (min)", sortable: true },
        ]
      }
      return [
        { key: "date", label: "Date", sortable: true },
        { key: "medical", label: "Medical", sortable: true },
        { key: "dental", label: "Dental", sortable: true },
        { key: "total", label: "Total", sortable: true },
      ]
    }
    if (kind === "daily_dental") {
      return [
        { key: "date", label: "Date", sortable: true },
        { key: "dental", label: "Consultations", sortable: true },
        { key: "patients", label: "Patients", sortable: true },
        { key: "avgWait", label: "Avg wait (min)", sortable: true },
      ]
    }
    if (kind === "medical_certificate" || kind === "dental_certificate") {
      return [
        { key: "date", label: "Date", sortable: true },
        { key: "certificateType", label: "Type", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "count", label: "Count", sortable: true },
      ]
    }
  }
  switch (kind) {
    case "monthly_consultation":
    case "monthly_dental":
      return [
        { key: "period", label: "Period", sortable: true },
        { key: "consultations", label: "Consultations", sortable: true },
        { key: "patients", label: "Patients", sortable: true },
        { key: "avgWait", label: "Avg wait (min)", sortable: true },
      ]
    case "patient_list":
      return [
        { key: "patient", label: "Patient", sortable: true },
        { key: "campusId", label: "Campus ID", sortable: true },
        { key: "type", label: "Type", sortable: true },
        { key: "service", label: "Last service", sortable: true },
        { key: "date", label: "Last visit", sortable: true },
      ]
    case "queue_performance":
      return [
        { key: "date", label: "Date", sortable: true },
        { key: "station", label: "Station", sortable: true },
        { key: "served", label: "Served", sortable: true },
        { key: "avgWait", label: "Avg wait", sortable: true },
        { key: "walkIns", label: "Walk-ins", sortable: true },
        { key: "peakHour", label: "Peak hour", sortable: true },
      ]
    case "medical_certificate":
    case "dental_certificate":
      return [
        { key: "date", label: "Date", sortable: true },
        { key: "patient", label: "Patient", sortable: true },
        { key: "campusId", label: "Campus ID", sortable: true },
        { key: "certificateType", label: "Type", sortable: true },
        { key: "doctor", label: "Doctor", sortable: true },
        { key: "status", label: "Status", sortable: true },
      ]
    case "consultation_request":
      return [
        { key: "submittedAt", label: "Submitted", sortable: true },
        { key: "patient", label: "Patient", sortable: true },
        { key: "campusId", label: "Campus ID", sortable: true },
        { key: "service", label: "Service", sortable: true },
        { key: "preferredDate", label: "Preferred", sortable: true },
        { key: "status", label: "Status", sortable: true },
      ]
    case "service_utilization":
      return [
        { key: "service", label: "Service", sortable: true },
        { key: "total", label: "Total", sortable: true },
      ]
    case "health_cases":
      return [
        { key: "case", label: "Health Case", sortable: true },
        { key: "total", label: "Total", sortable: true },
      ]
    case "health_cases_by_patient_type":
      return [
        { key: "case", label: "Health Case", sortable: true },
        { key: "student", label: "Student", sortable: true },
        { key: "faculty", label: "Faculty", sortable: true },
        { key: "employee", label: "Employee", sortable: true },
        { key: "total", label: "Total", sortable: true },
      ]
    case "patient_service_statistics":
      return [
        { key: "type", label: "Patient Type", sortable: true },
        { key: "total", label: "Total", sortable: true },
        { key: "percent", label: "Percentage", sortable: true },
      ]
    default:
      return [
        { key: "date", label: "Date", sortable: true },
        { key: "patient", label: "Patient", sortable: true },
        { key: "campusId", label: "Campus ID", sortable: true },
        { key: "type", label: "Type", sortable: true },
        { key: "service", label: "Service", sortable: true },
        { key: "diagnosis", label: "Diagnosis", sortable: true },
        { key: "personnel", label: "Personnel", sortable: true },
        { key: "status", label: "Status", sortable: true },
      ]
  }
}

function toDailyAggregateRows(rows: SeedConsultRow[]): ReportTableRow[] {
  const byDate = new Map<
    string,
    {
      count: number
      patients: Set<string>
      medical: number
      dental: number
      wait: number
    }
  >()
  for (const row of rows) {
    const entry = byDate.get(row.date) ?? {
      count: 0,
      patients: new Set<string>(),
      medical: 0,
      dental: 0,
      wait: 0,
    }
    entry.count += 1
    entry.patients.add(row.campusId)
    if (row.consultationType === "dental") entry.dental += 1
    else entry.medical += 1
    entry.wait += row.waitMinutes
    byDate.set(row.date, entry)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entry]) => ({
      id: date,
      cells: {
        date,
        consultations: entry.count,
        patients: entry.patients.size,
        medical: entry.medical,
        dental: entry.dental,
        total: entry.medical + entry.dental,
        avgWait: Math.round(entry.wait / Math.max(entry.count, 1)),
      },
      details: {
        Date: date,
        Consultations: String(entry.count),
        Patients: String(entry.patients.size),
        Medical: String(entry.medical),
        Dental: String(entry.dental),
        "Avg wait (min)": String(
          Math.round(entry.wait / Math.max(entry.count, 1))
        ),
      },
    }))
}

function toCertAggregateRows(certs: SeedCertRow[]): ReportTableRow[] {
  const byKey = new Map<string, number>()
  for (const cert of certs) {
    const key = `${cert.date}|${cert.certificateType}|${cert.status}`
    byKey.set(key, (byKey.get(key) ?? 0) + 1)
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, count]) => {
      const [date, certificateType, status] = key.split("|")
      return {
        id: key,
        cells: { date, certificateType, status, count },
        details: {
          Date: date,
          Type: certificateType,
          Status: status,
          Count: String(count),
        },
      }
    })
}

function buildTable(
  kind: ReportKind,
  consults: SeedConsultRow[],
  certs: SeedCertRow[],
  requests: SeedRequestRow[],
  queueDays: SeedQueueDay[],
  query: string,
  aggregateOnly = false,
  designation?: ClinicDesignation
): ReportTableBundle {
  let rows: ReportTableRow[] = []

  if (
    kind === "daily_consultation" ||
    kind === "monthly_consultation" ||
    kind === "daily_dental" ||
    kind === "monthly_dental" ||
    kind === "patient_consultation_history" ||
    kind === "patient_dental_history"
  ) {
    if (
      aggregateOnly &&
      (kind === "daily_consultation" || kind === "daily_dental")
    ) {
      rows = toDailyAggregateRows(consults)
    } else {
      rows = toTableRowsFromConsults(kind, consults)
    }
  } else if (kind === "patient_list") {
    if (aggregateOnly) {
      rows = toDailyAggregateRows(consults)
    } else {
      const byPatient = new Map<string, SeedConsultRow>()
      for (const row of consults) {
        const prev = byPatient.get(row.campusId)
        if (!prev || row.date > prev.date) byPatient.set(row.campusId, row)
      }
      rows = [...byPatient.values()].map((row) => ({
        id: row.campusId,
        cells: {
          patient: row.patientName,
          campusId: row.campusId,
          type: reportPatientTypeLabel(row.patientType),
          service: row.service,
          date: row.date,
        },
        details: {
          Patient: row.patientName,
          "Campus ID": row.campusId,
          Type: reportPatientTypeLabel(row.patientType),
          "Last service": row.service,
          "Last visit": row.date,
        },
      }))
    }
  } else if (kind === "queue_performance") {
    rows = queueDays.map((q) => ({
      id: q.id,
      cells: {
        date: q.date,
        station: q.station,
        served: q.served,
        avgWait: q.avgWaitMinutes,
        walkIns: q.walkIns,
        peakHour: q.peakHour,
      },
      details: {
        Date: q.date,
        Station: q.station,
        Served: String(q.served),
        "Avg wait": String(q.avgWaitMinutes),
        "Walk-ins": String(q.walkIns),
        "Peak hour": q.peakHour,
      },
    }))
  } else if (kind === "medical_certificate" || kind === "dental_certificate") {
    if (aggregateOnly) {
      rows = toCertAggregateRows(certs)
    } else {
      rows = certs.map((c) => ({
        id: c.id,
        cells: {
          date: c.date,
          patient: c.patientName,
          campusId: c.campusId,
          certificateType: c.certificateType,
          doctor: c.doctorName,
          status: c.status,
        },
        details: {
          Date: c.date,
          Patient: c.patientName,
          "Campus ID": c.campusId,
          Type: c.certificateType,
          Doctor: c.doctorName,
          Status: c.status,
        },
      }))
    }
  } else if (kind === "consultation_request") {
    rows = requests.map((r) => ({
      id: r.id,
      cells: {
        submittedAt: r.submittedAt,
        patient: r.patientName,
        campusId: r.campusId,
        service: r.service,
        preferredDate: r.preferredDate,
        status: r.status,
      },
      details: {
        Submitted: r.submittedAt,
        Patient: r.patientName,
        "Campus ID": r.campusId,
        Service: r.service,
        Preferred: r.preferredDate,
        Status: r.status,
        Personnel: r.assignedPersonnel,
      },
    }))
  } else if (kind === "service_utilization") {
    const utilization = [
      ["Student Medical", "student", "medical"],
      ["Student Dental", "student", "dental"],
      ["Faculty Medical", "faculty", "medical"],
      ["Faculty Dental", "faculty", "dental"],
      ["Employee Medical", "employee", "medical"],
      ["Employee Dental", "employee", "dental"],
    ] as const
    rows = utilization
      .map(([label, type, service]) => ({
        label,
        total: consults.filter(
          (row) =>
            reportPatientClass(row.patientType) === type &&
            row.consultationType === service
        ).length,
      }))
      .filter((row) => row.total > 0)
      .map((row) => ({
        id: row.label,
        cells: { service: row.label, total: row.total },
      }))
  } else if (kind === "health_cases" || kind === "health_cases_by_patient_type") {
    const caseBuckets = new Map<
      string,
      { student: number; faculty: number; employee: number; total: number }
    >()
    for (const consult of consults) {
      const label = normalizeHealthCase(
        consult.complaint === "—" ? consult.diagnosis : consult.complaint,
        consult.consultationType
      )
      const bucket = caseBuckets.get(label) ?? {
        student: 0,
        faculty: 0,
        employee: 0,
        total: 0,
      }
      const classified = reportPatientClass(consult.patientType)
      if (classified === "student") bucket.student += 1
      else if (classified === "faculty") bucket.faculty += 1
      else if (classified === "employee") bucket.employee += 1
      bucket.total += 1
      caseBuckets.set(label, bucket)
    }
    const ranked = rankHealthCases(
      [...caseBuckets.entries()].map(([label, counts]) => ({
        label,
        ...counts,
      }))
    )
    rows =
      kind === "health_cases"
        ? ranked.map((bucket) => ({
            id: bucket.label,
            cells: { case: bucket.label, total: bucket.total },
          }))
        : ranked.map((bucket) => ({
            id: `type-${bucket.label}`,
            cells: {
              case: bucket.label,
              student: bucket.student,
              faculty: bucket.faculty,
              employee: bucket.employee,
              total: bucket.total,
            },
          }))
  } else if (kind === "patient_service_statistics") {
    const mix = {
      Student: consults.filter((row) => reportPatientClass(row.patientType) === "student").length,
      Faculty: consults.filter((row) => reportPatientClass(row.patientType) === "faculty").length,
      Employee: consults.filter((row) => reportPatientClass(row.patientType) === "employee").length,
    }
    const mixTotal = mix.Student + mix.Faculty + mix.Employee
    rows = (["Student", "Faculty", "Employee"] as const).map((type) => ({
      id: type,
      cells: {
        type,
        total: mix[type],
        percent:
          mixTotal > 0 ? `${Math.round((mix[type] / mixTotal) * 100)}%` : "0%",
      },
    }))
  }

  return {
    kind,
    title: REPORT_KIND_LABELS[kind],
    columns: columnsFor(
      aggregateOnly && kind === "patient_list" ? "daily_consultation" : kind,
      aggregateOnly,
      designation
    ),
    rows: searchRows(rows, query),
  }
}

export function applyReportsFilters(
  designation: ClinicDesignation,
  filters: ReportFilters,
  live: ReportsLiveMetrics = EMPTY_LIVE,
  dataset: ReportsDataset = EMPTY_DATASET
): Omit<ReportsBundle, "generatedAt" | "source" | "live" | "dataset" | "error"> {
  const catalog = catalogFor(designation)
  const effective: ReportFilters = {
    ...filters,
    consultationType: catalog.lockConsultationType
      ? catalog.defaultConsultationType
      : filters.consultationType,
    reportKind: catalog.reportKinds.includes(filters.reportKind)
      ? filters.reportKind
      : (catalog.reportKinds[0] ?? "daily_consultation"),
  }

  const consults = filterConsults(dataset.consults, effective)
  const certs = filterCerts(dataset.certs, effective)
  const requests = filterRequests(dataset.requests, effective)
  const queueDays = filterQueue(dataset.queueDays, effective)

  const tables = catalog.reportKinds.map((kind) => {
    let scopedConsults = consults
    let scopedCerts = certs
    if (kind === "daily_dental" || kind === "monthly_dental" || kind === "patient_dental_history") {
      scopedConsults = consults.filter((c) => c.consultationType === "dental")
    }
    if (kind === "dental_certificate") {
      scopedCerts = certs.filter((c) => c.consultationType === "dental")
    }
    if (kind === "medical_certificate") {
      scopedCerts = certs.filter((c) => c.consultationType === "medical")
    }
    if (
      kind === "daily_consultation" ||
      kind === "monthly_consultation" ||
      kind === "patient_consultation_history"
    ) {
      if (designation === "physician") {
        scopedConsults = consults.filter((c) => c.consultationType === "medical")
      }
    }
    return buildTable(
      kind,
      scopedConsults,
      scopedCerts,
      requests,
      queueDays,
      effective.query,
      true,
      designation
    )
  })

  const personnel = [
    ...new Set([
      ...dataset.consults.map((c) => c.assignedPersonnel),
      ...dataset.certs.map((c) => c.doctorName),
      ...dataset.requests.map((r) => r.assignedPersonnel),
    ]),
  ]
    .filter(Boolean)
    .sort()

  const statuses = [
    ...new Set([
      ...dataset.consults.map((c) => c.status),
      ...dataset.certs.map((c) => c.status),
      ...dataset.requests.map((r) => r.status),
    ]),
  ]
    .filter(Boolean)
    .sort()

  const chartKeys = catalog.chartKeys

  return {
    designation,
    filters: effective,
    kpis: buildKpis(catalog.kpiKeys, consults, certs, requests, live, designation),
    charts: buildCharts(
      chartKeys,
      consults,
      requests,
      queueDays,
      effective.dateFrom,
      effective.dateTo,
      designation
    ),
    tables,
    personnelOptions: personnel,
    statusOptions: statuses,
  }
}
