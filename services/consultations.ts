import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { consultationDateInRange } from "@/lib/date/consultation-date-range"
import { patientMatchesSearchQuery } from "@/lib/clinical/record-scope"
import { createClient } from "@/lib/supabase/server"
import {
  ConsultationServiceError,
  consultationFromJson,
  consultationMatchesProviderRole,
  consultationToJson,
  normalizeConsultationStatus,
  resolveConsultationProviderRole,
  type Consultation,
  type ConsultationJson,
  type ConsultationListParams,
  type ConsultationListResult,
  type ConsultationStats,
  type CreateConsultationInput,
  type UpdateConsultationInput,
} from "@/types/consultation"

const DEFAULT_PAGE_SIZE = 20

const SELECT_WITH_PATIENT = `
  id,
  patient_id,
  chief_complaint,
  symptoms,
  assessment,
  diagnosis,
  treatment,
  prescription,
  provider_name,
  provider_role,
  station,
  status,
  priority,
  consultation_date,
  follow_up_date,
  notes,
  queue_ticket_id,
  consultation_request_id,
  appointment_id,
  provider_type,
  vitals,
  created_at,
  updated_at,
  patient_records (
    id,
    patient_type,
    first_name,
    last_name,
    student_id,
    employee_id
  )
`

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new ConsultationServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new ConsultationServiceError(
      "permission",
      "You do not have permission to access consultations."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new ConsultationServiceError(
      "not_found",
      "Consultation not found."
    )
  }
  if (error.code === "23503" || message.includes("foreign key")) {
    throw new ConsultationServiceError(
      "validation",
      "Selected patient was not found."
    )
  }
  throw new ConsultationServiceError(
    "database",
    error.message || "A database error occurred while loading consultations."
  )
}

function manilaDayBounds(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"
  const isoDate = `${year}-${month}-${day}`
  return {
    isoDate,
    startIso: `${isoDate}T00:00:00+08:00`,
    endIso: `${isoDate}T23:59:59.999+08:00`,
  }
}

function validateCreate(input: CreateConsultationInput) {
  if (!input.patientId.trim()) {
    throw new ConsultationServiceError("validation", "Patient is required.")
  }
  if (!input.chiefComplaint?.trim()) {
    throw new ConsultationServiceError(
      "validation",
      "Chief complaint is required."
    )
  }
}

function matchesQuery(row: Consultation, query: string): boolean {
  return patientMatchesSearchQuery(
    row.patient.fullName,
    row.patient.studentId,
    query
  )
}

function matchesFilters(
  row: Consultation,
  params: ConsultationListParams
): boolean {
  if (
    params.status &&
    params.status !== "all" &&
    normalizeConsultationStatus(row.status) !== params.status
  ) {
    return false
  }
  if (
    params.provider &&
    params.provider !== "all" &&
    (row.providerName ?? "") !== params.provider
  ) {
    return false
  }
  if (
    params.station &&
    params.station !== "all" &&
    (row.station ?? "") !== params.station
  ) {
    return false
  }
  if (
    params.providerType &&
    params.providerType !== "all" &&
    resolveConsultationProviderRole(row) !== params.providerType
  ) {
    return false
  }
  if (params.consultationDate && params.consultationDate !== "all") {
    const day = row.consultationDate.slice(0, 10)
    if (day !== params.consultationDate) return false
  }
  if (params.dateRange && params.dateRange !== "all_time") {
    if (!consultationDateInRange(row.consultationDate, params.dateRange)) {
      return false
    }
  }
  return true
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

function mapConsultationsFromJson(rows: ConsultationJson[]): Consultation[] {
  const items: Consultation[] = []
  for (const row of rows) {
    try {
      items.push(consultationFromJson(row))
    } catch {
      /* skip legacy rows with invalid enum values */
    }
  }
  return items
}

function formatQueueLabel(value: number | string | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === "string" && value.trim()) return value.trim()
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return String(n).padStart(3, "0")
}

async function attachQueueNumbers(
  items: Consultation[],
  supabase: SupabaseClient
): Promise<Consultation[]> {
  const ticketIds = [
    ...new Set(items.map((i) => i.queueTicketId).filter(Boolean)),
  ] as string[]
  const appointmentIds = [
    ...new Set(items.map((i) => i.appointmentId).filter(Boolean)),
  ] as string[]

  const ticketMap = new Map<string, string>()
  const apptMap = new Map<string, string>()

  if (ticketIds.length > 0) {
    const { data } = await supabase
      .from("health_queue_tickets")
      .select("id, queue_number, ticket_code")
      .in("id", ticketIds)
    for (const row of data ?? []) {
      const label =
        (row.ticket_code as string | null) ??
        formatQueueLabel(row.queue_number as number | null)
      if (label) ticketMap.set(row.id as string, label)
    }
  }

  if (appointmentIds.length > 0) {
    const { data } = await supabase
      .from("appointments")
      .select("id, queue_number")
      .in("id", appointmentIds)
    for (const row of data ?? []) {
      const label = formatQueueLabel(row.queue_number as number | null)
      if (label) apptMap.set(row.id as string, label)
    }
  }

  return items.map((item) => ({
    ...item,
    queueNumber:
      (item.queueTicketId ? ticketMap.get(item.queueTicketId) : null) ??
      (item.appointmentId ? apptMap.get(item.appointmentId) : null) ??
      null,
  }))
}

export async function getConsultations(
  params: ConsultationListParams = {},
  client?: SupabaseClient
): Promise<ConsultationListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = params.query?.trim() ?? ""

  const { data, error } = await supabase
    .from("consultations")
    .select(SELECT_WITH_PATIENT)
    .order("consultation_date", { ascending: false })

  if (error) mapError(error)

  let items = mapConsultationsFromJson((data ?? []) as ConsultationJson[])
  items = await attachQueueNumbers(items, supabase)

  if (query) {
    items = items.filter((item) => matchesQuery(item, query))
  }
  items = items.filter((item) => matchesFilters(item, params))

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function searchConsultations(
  query: string,
  params: Omit<ConsultationListParams, "query"> = {},
  client?: SupabaseClient
): Promise<ConsultationListResult> {
  return getConsultations({ ...params, query }, client)
}

export async function getConsultationById(
  id: string,
  client?: SupabaseClient
): Promise<Consultation> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultations")
    .select(SELECT_WITH_PATIENT)
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationServiceError("not_found", "Consultation not found.")
  }

  return consultationFromJson(data as ConsultationJson)
}

export async function getConsultationsByPatientId(
  patientId: string,
  options?: { stationFilter?: "dentist" | "physician" | "nurse" | "all" },
  client?: SupabaseClient
): Promise<Consultation[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultations")
    .select(SELECT_WITH_PATIENT)
    .eq("patient_id", patientId)
    .order("consultation_date", { ascending: false })

  if (error) mapError(error)
  let rows = mapConsultationsFromJson((data ?? []) as ConsultationJson[])
  const stationFilter = options?.stationFilter
  if (stationFilter && stationFilter !== "all" && stationFilter !== "nurse") {
    rows = rows.filter((row) =>
      consultationMatchesProviderRole(row, stationFilter)
    )
  }
  return rows
}

export async function getConsultationVisitDetail(
  consultationId: string,
  client?: SupabaseClient
): Promise<{
  consultation: Consultation
  ticketVitals: import("@/lib/health/types").QueueVitals | null
}> {
  const consultation = await getConsultationById(consultationId, client)
  if (!consultation.queueTicketId) {
    return { consultation, ticketVitals: null }
  }

  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("health_queue_tickets")
    .select(
      `
      vitals_bp_systolic,
      vitals_bp_diastolic,
      vitals_heart_rate,
      vitals_temperature_c,
      vitals_spo2,
      vitals_height_cm,
      vitals_weight_kg,
      vitals_respiratory_rate
    `
    )
    .eq("id", consultation.queueTicketId)
    .maybeSingle()

  if (error || !data) {
    return { consultation, ticketVitals: null }
  }

  return {
    consultation,
    ticketVitals: {
      bpSystolic: data.vitals_bp_systolic,
      bpDiastolic: data.vitals_bp_diastolic,
      heartRate: data.vitals_heart_rate,
      temperatureC:
        data.vitals_temperature_c == null
          ? null
          : Number(data.vitals_temperature_c),
      spo2: data.vitals_spo2,
      heightCm:
        data.vitals_height_cm == null ? null : Number(data.vitals_height_cm),
      weightKg:
        data.vitals_weight_kg == null ? null : Number(data.vitals_weight_kg),
      respiratoryRate: data.vitals_respiratory_rate ?? null,
    },
  }
}

export async function getConsultationStats(
  client?: SupabaseClient
): Promise<ConsultationStats> {
  const supabase = await getClient(client)
  const { startIso, endIso } = manilaDayBounds()

  const [openResult, waitingResult, ongoingResult, completedResult] =
    await Promise.all([
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting"),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("status", "ongoing"),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("updated_at", startIso)
        .lte("updated_at", endIso),
    ])

  if (openResult.error) mapError(openResult.error)
  if (waitingResult.error) mapError(waitingResult.error)
  if (ongoingResult.error) mapError(ongoingResult.error)
  if (completedResult.error) mapError(completedResult.error)

  return {
    openToday: openResult.count ?? 0,
    awaitingAssessment: waitingResult.count ?? 0,
    inProgress: ongoingResult.count ?? 0,
    completedToday: completedResult.count ?? 0,
  }
}

function matchesClinicianRole(
  row: Consultation,
  role: "physician" | "dentist"
): boolean {
  return consultationMatchesProviderRole(row, role)
}

/** Physician/dentist board: all consultations for their role (any status). */
export async function getConsultationsForClinician(
  role: "physician" | "dentist",
  params: ConsultationListParams = {},
  client?: SupabaseClient
): Promise<ConsultationListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = params.query?.trim() ?? ""
  const consultationDate =
    params.consultationDate && params.consultationDate !== "all"
      ? params.consultationDate
      : "all"

  const { data, error } = await supabase
    .from("consultations")
    .select(SELECT_WITH_PATIENT)
    .order("consultation_date", { ascending: false })

  if (error) mapError(error)

  let items = mapConsultationsFromJson((data ?? []) as ConsultationJson[])
    .filter((item) => matchesClinicianRole(item, role))

  items = await attachQueueNumbers(items, supabase)

  if (query) {
    items = items.filter((item) => matchesQuery(item, query))
  }
  items = items.filter((item) =>
    matchesFilters(item, {
      ...params,
      station: "all",
      consultationDate,
    })
  )

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function getConsultationStatsForClinician(
  role: "physician" | "dentist",
  client?: SupabaseClient
): Promise<ConsultationStats> {
  const supabase = await getClient(client)
  const { startIso, endIso, isoDate } = manilaDayBounds()

  const { data, error } = await supabase
    .from("consultations")
    .select(
      "id, status, station, provider_type, consultation_date, updated_at"
    )

  if (error) mapError(error)

  const rows = (data ?? []).filter((row) =>
    consultationMatchesProviderRole(
      {
        providerType:
          row.provider_type === "dentist" || row.provider_type === "physician"
            ? row.provider_type
            : null,
        station: row.station as string | null,
      },
      role
    )
  )

  const waiting = rows.filter(
    (r) => normalizeConsultationStatus(String(r.status)) === "waiting"
  ).length
  const ongoing = rows.filter(
    (r) => normalizeConsultationStatus(String(r.status)) === "ongoing"
  ).length
  const completedToday = rows.filter((r) => {
    if (normalizeConsultationStatus(String(r.status)) !== "completed") {
      return false
    }
    const updated = (r.updated_at as string | null) ?? ""
    return updated >= startIso && updated <= endIso
  }).length
  const openToday = rows.filter((r) => {
    const day = String(r.consultation_date ?? "").slice(0, 10)
    return (
      day === isoDate &&
      normalizeConsultationStatus(String(r.status)) !== "completed"
    )
  }).length

  return {
    openToday,
    awaitingAssessment: waiting,
    inProgress: ongoing,
    completedToday,
  }
}

export async function createConsultation(
  input: CreateConsultationInput,
  client?: SupabaseClient
): Promise<Consultation> {
  validateCreate(input)
  const supabase = await getClient(client)
  const payload = consultationToJson(input)

  const { data, error } = await supabase
    .from("consultations")
    .insert(payload)
    .select(SELECT_WITH_PATIENT)
    .single()

  if (error) mapError(error)

  // Keep patient last_visit in sync when a consultation is created.
  const visitDate = (payload.consultation_date ?? new Date().toISOString()).slice(
    0,
    10
  )
  await supabase
    .from("patient_records")
    .update({ last_visit: visitDate })
    .eq("id", input.patientId)

  return consultationFromJson(data as ConsultationJson)
}

export async function updateConsultation(
  input: UpdateConsultationInput,
  client?: SupabaseClient
): Promise<Consultation> {
  if (!input.id.trim()) {
    throw new ConsultationServiceError("validation", "Consultation ID is required.")
  }
  validateCreate(input)

  const supabase = await getClient(client)
  const payload = consultationToJson(input)

  const { data, error } = await supabase
    .from("consultations")
    .update(payload)
    .eq("id", input.id)
    .select(SELECT_WITH_PATIENT)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationServiceError("not_found", "Consultation not found.")
  }

  return consultationFromJson(data as ConsultationJson)
}

export async function deleteConsultation(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  if (!id.trim()) {
    throw new ConsultationServiceError("validation", "Consultation ID is required.")
  }

  const supabase = await getClient(client)
  const { error, count } = await supabase
    .from("consultations")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) mapError(error)
  if (!count) {
    throw new ConsultationServiceError("not_found", "Consultation not found.")
  }
}

/** Marks consultation, linked ticket, and request as completed. */
export async function completeConsultationVisit(
  input: {
    consultationId: string
    queueTicketId?: string | null
    consultationRequestId?: string | null
  },
  client?: SupabaseClient
): Promise<Consultation> {
  const supabase = await getClient(client)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("consultations")
    .update({
      status: "completed",
      queue_ticket_id: input.queueTicketId ?? undefined,
      consultation_request_id: input.consultationRequestId ?? undefined,
      updated_at: now,
    })
    .eq("id", input.consultationId)
    .select(SELECT_WITH_PATIENT)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationServiceError("not_found", "Consultation not found.")
  }

  if (input.queueTicketId) {
    await supabase
      .from("health_queue_tickets")
      .update({ status: "completed", updated_at: now })
      .eq("id", input.queueTicketId)
  }
  if (input.consultationRequestId) {
    await supabase
      .from("consultation_requests")
      .update({ status: "completed", updated_at: now })
      .eq("id", input.consultationRequestId)
  }

  return consultationFromJson(data as ConsultationJson)
}

export async function listConsultationFilterOptions(
  client?: SupabaseClient
): Promise<{ providers: string[]; stations: string[] }> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultations")
    .select("provider_name, station")

  if (error) mapError(error)

  const providers = new Set<string>()
  const stations = new Set<string>()
  for (const row of data ?? []) {
    if (row.provider_name?.trim()) providers.add(row.provider_name.trim())
    if (row.station?.trim()) stations.add(row.station.trim())
  }

  return {
    providers: Array.from(providers).sort((a, b) => a.localeCompare(b)),
    stations: Array.from(stations).sort((a, b) => a.localeCompare(b)),
  }
}
