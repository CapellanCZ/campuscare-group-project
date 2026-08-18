import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  ConsultationServiceError,
  consultationFromJson,
  consultationToJson,
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
  const q = query.trim().toLowerCase()
  if (!q) return true
  const studentId = (row.patient.studentId ?? "").toLowerCase()
  return studentId.includes(q)
}

function matchesFilters(
  row: Consultation,
  params: ConsultationListParams
): boolean {
  if (params.status && params.status !== "all" && row.status !== params.status) {
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
  if (params.consultationDate && params.consultationDate !== "all") {
    const day = row.consultationDate.slice(0, 10)
    if (day !== params.consultationDate) return false
  }
  return true
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
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

  let items = ((data ?? []) as ConsultationJson[]).map(consultationFromJson)

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
  client?: SupabaseClient
): Promise<Consultation[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultations")
    .select(SELECT_WITH_PATIENT)
    .eq("patient_id", patientId)
    .order("consultation_date", { ascending: false })

  if (error) mapError(error)
  return ((data ?? []) as ConsultationJson[]).map(consultationFromJson)
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
      status: "Completed",
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
