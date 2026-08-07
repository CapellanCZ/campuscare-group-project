import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getStaffAccess } from "@/lib/auth/access"
import { can } from "@/lib/auth/permissions"
import type { ClinicDesignation } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"
import {
  admitWaitlistedConsultationRequest,
  approveConsultationRequest as queueApprove,
  releaseConsultationReservation,
} from "@/lib/health/queue-actions"
import { recommendComeEarly } from "@/lib/health/consultation-workflow"
import { reReserveConsultationRequestDate } from "@/services/consultation-submit"
import {
  CONSULTATION_REQUEST_STATUSES,
  ConsultationRequestServiceError,
  type AdmitConsultationRequestInput,
  type ApproveConsultationRequestInput,
  type ConsultationRequest,
  type ConsultationRequestAttachment,
  type ConsultationRequestAttachmentCategory,
  type ConsultationRequestAuditItem,
  type ConsultationRequestListParams,
  type ConsultationRequestListResult,
  type ConsultationRequestMedicalHistory,
  type ConsultationRequestNote,
  type ConsultationRequestStats,
  type ConsultationRequestStatus,
  type ConsultationRequestTimelineItem,
  type DeclineConsultationRequestInput,
  type RescheduleConsultationRequestInput,
  type UpdateConsultationRequestStatusInput,
} from "@/types/consultationRequest"

const DEFAULT_PAGE_SIZE = 20
export const CONSULTATION_REQUEST_ATTACHMENTS_BUCKET =
  "consultation-request-attachments"

type RequestRow = {
  id: string
  patient_record_id: string | null
  patient_name: string
  student_id: string | null
  course: string | null
  year_level: string | null
  email: string | null
  phone: string | null
  service: string
  provider_type: string | null
  preferred_date: string | null
  preferred_time: string | null
  reason: string
  symptoms: string | null
  additional_notes: string | null
  status: string
  assigned_nurse_id: string | null
  assigned_doctor_id: string | null
  assigned_nurse_name: string | null
  assigned_doctor_name: string | null
  consultation_room: string | null
  schedule_at: string | null
  decline_reason: string | null
  reschedule_reason: string | null
  approval_notes: string | null
  queue_ticket_id: string | null
  queue_number: number | null
  waitlisted_at: string | null
  created_by: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

function isStatus(value: string): value is ConsultationRequestStatus {
  return (CONSULTATION_REQUEST_STATUSES as readonly string[]).includes(value)
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new ConsultationRequestServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new ConsultationRequestServiceError(
      "permission",
      "You do not have permission to manage consultation requests."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new ConsultationRequestServiceError(
      "not_found",
      "Consultation request not found."
    )
  }
  throw new ConsultationRequestServiceError(
    "database",
    error.message || "A database error occurred."
  )
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function requireStaffActor(): Promise<{
  userId: string
  fullName: string
  designation: string
}> {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    throw new ConsultationRequestServiceError(
      "permission",
      "You must be signed in as clinic staff."
    )
  }
  if (!can(access.designation, "requests.table")) {
    throw new ConsultationRequestServiceError(
      "permission",
      "You do not have permission to manage consultation requests."
    )
  }
  return {
    userId: access.userId,
    fullName: access.fullName || access.email || "Clinic staff",
    designation: access.designation,
  }
}

function mapRequest(
  row: RequestRow,
  extras?: Partial<
    Pick<
      ConsultationRequest,
      "attachments" | "timeline" | "notes" | "auditLog" | "medicalHistory"
    >
  >
): ConsultationRequest {
  if (!isStatus(row.status)) {
    throw new ConsultationRequestServiceError(
      "database",
      `Unexpected request status: ${row.status}`
    )
  }
  return {
    id: row.id,
    patientRecordId: row.patient_record_id,
    patientName: row.patient_name,
    studentId: row.student_id,
    course: row.course,
    yearLevel: row.year_level,
    email: row.email,
    phone: row.phone,
    service: row.service,
    providerType:
      row.provider_type === "dentist" ? "dentist" : "physician",
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    reason: row.reason,
    symptoms: row.symptoms,
    additionalNotes: row.additional_notes,
    status: row.status,
    assignedNurseId: row.assigned_nurse_id,
    assignedDoctorId: row.assigned_doctor_id,
    assignedNurseName: row.assigned_nurse_name,
    assignedDoctorName: row.assigned_doctor_name,
    consultationRoom: row.consultation_room,
    scheduleAt: row.schedule_at,
    declineReason: row.decline_reason,
    rescheduleReason: row.reschedule_reason,
    approvalNotes: row.approval_notes,
    queueTicketId: row.queue_ticket_id,
    queueNumber: row.queue_number,
    waitlistedAt: row.waitlisted_at,
    createdBy: row.created_by,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recommendComeEarly: recommendComeEarly(row.queue_number),
    attachments: extras?.attachments ?? [],
    timeline: extras?.timeline ?? [],
    notes: extras?.notes ?? [],
    auditLog: extras?.auditLog ?? [],
    medicalHistory: extras?.medicalHistory ?? null,
  }
}

function matchesQuery(item: ConsultationRequest, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    item.patientName,
    item.studentId,
    item.email,
    item.service,
    item.assignedDoctorName,
    item.assignedNurseName,
    item.status,
    item.reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q)
}

async function appendTimeline(
  supabase: SupabaseClient,
  requestId: string,
  action: string,
  remarks: string | null,
  actorId: string,
  actorName: string
) {
  const { error } = await supabase.from("consultation_request_timeline").insert({
    request_id: requestId,
    action,
    remarks,
    actor_id: actorId,
    actor_name: actorName,
  })
  if (error) mapError(error)
}

async function appendAudit(
  supabase: SupabaseClient,
  requestId: string,
  event: string,
  details: string | null,
  actorId: string,
  actorName: string
) {
  const { error } = await supabase.from("consultation_request_audit").insert({
    request_id: requestId,
    event,
    details,
    actor_id: actorId,
    actor_name: actorName,
  })
  if (error) mapError(error)
}

async function loadRelated(
  supabase: SupabaseClient,
  requestId: string,
  withSignedUrls = false
): Promise<{
  attachments: ConsultationRequestAttachment[]
  timeline: ConsultationRequestTimelineItem[]
  notes: ConsultationRequestNote[]
  auditLog: ConsultationRequestAuditItem[]
}> {
  const [attachmentsRes, timelineRes, notesRes, auditRes] = await Promise.all([
    supabase
      .from("consultation_request_attachments")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    supabase
      .from("consultation_request_timeline")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    supabase
      .from("consultation_request_notes")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("consultation_request_audit")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
  ])

  if (attachmentsRes.error) mapError(attachmentsRes.error)
  if (timelineRes.error) mapError(timelineRes.error)
  if (notesRes.error) mapError(notesRes.error)
  if (auditRes.error) mapError(auditRes.error)

  let attachments: ConsultationRequestAttachment[] = (
    attachmentsRes.data ?? []
  ).map((row) => ({
    id: row.id as string,
    requestId: row.request_id as string,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    fileSize: Number(row.file_size) || 0,
    mimeType: row.mime_type as string,
    category: row.category as ConsultationRequestAttachmentCategory,
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    createdAt: row.created_at as string,
  }))

  if (withSignedUrls && attachments.length > 0) {
    attachments = await Promise.all(
      attachments.map(async (attachment) => {
        const { data } = await supabase.storage
          .from(CONSULTATION_REQUEST_ATTACHMENTS_BUCKET)
          .createSignedUrl(attachment.filePath, 60 * 60)
        return { ...attachment, url: data?.signedUrl ?? null }
      })
    )
  }

  const timeline: ConsultationRequestTimelineItem[] = (
    timelineRes.data ?? []
  ).map((row) => ({
    id: row.id as string,
    requestId: row.request_id as string,
    action: row.action as string,
    remarks: (row.remarks as string | null) ?? null,
    actorId: (row.actor_id as string | null) ?? null,
    actorName: (row.actor_name as string | null) ?? null,
    createdAt: row.created_at as string,
  }))

  const notes: ConsultationRequestNote[] = (notesRes.data ?? []).map((row) => ({
    id: row.id as string,
    requestId: row.request_id as string,
    body: row.body as string,
    authorId: (row.author_id as string | null) ?? null,
    authorName: (row.author_name as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))

  const auditLog: ConsultationRequestAuditItem[] = (auditRes.data ?? []).map(
    (row) => ({
      id: row.id as string,
      requestId: row.request_id as string,
      event: row.event as string,
      actorId: (row.actor_id as string | null) ?? null,
      actorName: (row.actor_name as string | null) ?? null,
      details: (row.details as string | null) ?? null,
      createdAt: row.created_at as string,
    })
  )

  return { attachments, timeline, notes, auditLog }
}

async function loadMedicalHistory(
  supabase: SupabaseClient,
  request: ConsultationRequest
): Promise<ConsultationRequestMedicalHistory> {
  let patientId = request.patientRecordId

  if (!patientId && request.studentId) {
    const { data } = await supabase
      .from("patient_records")
      .select("id")
      .eq("student_id", request.studentId)
      .limit(1)
      .maybeSingle()
    patientId = data?.id ?? null
  }

  if (!patientId) {
    return {
      allergies: null,
      currentMedications: null,
      medicalConditions: null,
      previousVisits: [],
      previousConsultations: [],
      previousCertificates: [],
      vaccinationHistory: null,
      hasRecords: false,
    }
  }

  const [patientRes, consultsRes, patientsRes, priorRequestsRes] =
    await Promise.all([
      supabase
        .from("patient_records")
        .select(
          "allergies, medical_conditions, notes, medical_history, last_visit"
        )
        .eq("id", patientId)
        .maybeSingle(),
      supabase
        .from("consultations")
        .select(
          "id, consultation_date, chief_complaint, status, provider_name"
        )
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: false })
        .limit(20),
      request.studentId
        ? supabase
            .from("patients")
            .select("id")
            .or(
              `student_id.eq.${request.studentId},employee_id.eq.${request.studentId}`
            )
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("consultation_requests")
        .select("id, submitted_at, service, status")
        .neq("id", request.id)
        .or(
          [
            `patient_record_id.eq.${patientId}`,
            request.studentId
              ? `student_id.eq.${request.studentId}`
              : null,
          ]
            .filter(Boolean)
            .join(",")
        )
        .order("submitted_at", { ascending: false })
        .limit(20),
    ])

  let previousCertificates: ConsultationRequestMedicalHistory["previousCertificates"] =
    []
  const operationalPatientId = patientsRes.data?.id as string | undefined
  if (operationalPatientId) {
    const { data: certs } = await supabase
      .from("medical_certificates")
      .select(
        "id, certificate_number, certificate_type, status, issued_at"
      )
      .eq("patient_id", operationalPatientId)
      .order("created_at", { ascending: false })
      .limit(20)
    previousCertificates = (certs ?? []).map((row) => ({
      id: row.id as string,
      certificateNumber: row.certificate_number as string,
      certificateType: row.certificate_type as string,
      status: row.status as string,
      issuedAt: (row.issued_at as string | null) ?? null,
    }))
  }

  const patient = patientRes.data
  const historyJson = (patient?.medical_history ?? {}) as Record<
    string,
    unknown
  >
  const allergyFlags = [
    historyJson.allergy === true ? "Allergy noted" : null,
    historyJson.asthma === true ? "Asthma" : null,
    historyJson.tb === true ? "TB" : null,
    historyJson.diabetesMellitus === true ? "Diabetes mellitus" : null,
    historyJson.heartAilment === true ? "Heart ailment" : null,
    historyJson.kidneyDisease === true ? "Kidney disease" : null,
  ].filter(Boolean)

  const allergies =
    [patient?.allergies, allergyFlags.length ? allergyFlags.join(", ") : null]
      .filter(Boolean)
      .join(" · ") || null

  const previousVisits = (consultsRes.data ?? []).map((row) => ({
    id: row.id as string,
    date: row.consultation_date as string,
    chiefComplaint: (row.chief_complaint as string | null) ?? null,
    status: row.status as string,
    providerName: (row.provider_name as string | null) ?? null,
  }))

  const previousConsultations = (priorRequestsRes.data ?? []).map((row) => ({
    id: row.id as string,
    date: row.submitted_at as string,
    service: row.service as string,
    status: row.status as string,
  }))

  const hasRecords = Boolean(
    allergies ||
      patient?.medical_conditions ||
      patient?.notes ||
      previousVisits.length ||
      previousConsultations.length ||
      previousCertificates.length
  )

  return {
    allergies,
    currentMedications: (patient?.notes as string | null) ?? null,
    medicalConditions: (patient?.medical_conditions as string | null) ?? null,
    previousVisits,
    previousConsultations,
    previousCertificates,
    vaccinationHistory: null,
    hasRecords,
  }
}

export async function getConsultationRequests(
  params: ConsultationRequestListParams = {},
  client?: SupabaseClient
): Promise<ConsultationRequestListResult> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(
    50,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE)
  )
  const query = params.query?.trim() ?? ""
  const status = params.status ?? "all"

  let request = supabase
    .from("consultation_requests")
    .select("*")
    .order("submitted_at", { ascending: false })

  if (status !== "all") {
    request = request.eq("status", status)
  }

  const { data, error } = await request
  if (error) mapError(error)

  let items = ((data ?? []) as RequestRow[]).map((row) => mapRequest(row))
  if (query) items = items.filter((item) => matchesQuery(item, query))

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

export async function getConsultationRequestStats(
  client?: SupabaseClient
): Promise<ConsultationRequestStats> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultation_requests")
    .select("status")
  if (error) mapError(error)

  const stats: ConsultationRequestStats = {
    pending: 0,
    approved: 0,
    declined: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
    waitlisted: 0,
    total: (data ?? []).length,
  }

  for (const row of data ?? []) {
    const status = row.status as ConsultationRequestStatus
    if (status in stats && status !== ("total" as never)) {
      stats[status] += 1
    }
  }
  return stats
}

export async function getConsultationRequestById(
  id: string,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultation_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError(
      "not_found",
      "Consultation request not found."
    )
  }

  const related = await loadRelated(supabase, id, true)
  const base = mapRequest(data as RequestRow, related)
  const medicalHistory = await loadMedicalHistory(supabase, base)
  return { ...base, medicalHistory }
}

export async function listAssignableDoctors(
  client?: SupabaseClient
): Promise<{ id: string; fullName: string; email: string | null }[]> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, primary_role")
    .in("primary_role", ["physician", "dentist"])
    .eq("is_active", true)
    .order("full_name", { ascending: true })

  if (error) mapError(error)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: (row.full_name as string) || (row.email as string),
    email: (row.email as string | null) ?? null,
  }))
}

export async function approveConsultationRequestRecord(
  input: ApproveConsultationRequestInput,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.approve")) {
    throw new ConsultationRequestServiceError(
      "permission",
      "Only nurses can approve consultation requests."
    )
  }

  const supabase = await getClient(client)
  const existing = await getConsultationRequestById(input.id, supabase)

  const queueResult = await queueApprove({
    designation: actor.designation as "nurse",
    requestId: existing.id,
    patientName: existing.patientName,
    studentId: existing.studentId ?? undefined,
    service: existing.service,
    reason: existing.reason,
    staffName: actor.fullName,
  })

  if (!queueResult.ok) {
    throw new ConsultationRequestServiceError(
      "database",
      queueResult.error || "Failed to approve the request."
    )
  }

  const patch = {
    status: "approved" as const,
    assigned_nurse_id: actor.userId,
    assigned_nurse_name: actor.fullName,
    assigned_doctor_id: input.doctorId ?? null,
    assigned_doctor_name: input.doctorName ?? null,
    consultation_room: input.consultationRoom?.trim() || null,
    schedule_at: input.scheduleAt || null,
    approval_notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("consultation_requests")
    .update(patch)
    .eq("id", input.id)

  if (error) mapError(error)

  await appendTimeline(
    supabase,
    input.id,
    "Approved",
    [
      input.doctorName ? `Assigned doctor: ${input.doctorName}` : null,
      input.consultationRoom ? `Room: ${input.consultationRoom}` : null,
      input.notes?.trim() || null,
      queueResult.message ?? null,
    ]
      .filter(Boolean)
      .join(" · ") || "Request approved; reserved queue number kept.",
    actor.userId,
    actor.fullName
  )
  await appendAudit(
    supabase,
    input.id,
    "approved_by",
    queueResult.ticketCode
      ? `Confirmed ${queueResult.ticketCode}`
      : "Request approved",
    actor.userId,
    actor.fullName
  )

  return getConsultationRequestById(input.id, supabase)
}

export async function admitConsultationRequestRecord(
  input: AdmitConsultationRequestInput,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.approve")) {
    throw new ConsultationRequestServiceError(
      "permission",
      "Only nurses can admit waitlisted requests."
    )
  }

  const supabase = await getClient(client)
  const result = await admitWaitlistedConsultationRequest({
    designation: actor.designation as "nurse",
    requestId: input.id,
    staffName: actor.fullName,
    force: input.force ?? true,
  })

  if (!result.ok) {
    throw new ConsultationRequestServiceError(
      "database",
      result.error || "Failed to admit waitlisted request."
    )
  }

  await appendTimeline(
    supabase,
    input.id,
    "Admitted",
    result.message ?? "Admitted from waitlist.",
    actor.userId,
    actor.fullName
  )
  await appendAudit(
    supabase,
    input.id,
    "admitted_from_waitlist",
    result.ticketCode
      ? `Queued as ${result.ticketCode}`
      : "Admitted from waitlist",
    actor.userId,
    actor.fullName
  )

  return getConsultationRequestById(input.id, supabase)
}

export async function declineConsultationRequestRecord(
  input: DeclineConsultationRequestInput,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.decline")) {
    throw new ConsultationRequestServiceError(
      "permission",
      "Only nurses can decline consultation requests."
    )
  }

  const reason = input.reason.trim()
  if (!reason) {
    throw new ConsultationRequestServiceError(
      "validation",
      "A decline reason is required."
    )
  }

  const supabase = await getClient(client)
  const existing = await getConsultationRequestById(input.id, supabase)
  await releaseConsultationReservation({
    requestId: existing.id,
    ticketId: existing.queueTicketId,
  })

  const { error } = await supabase
    .from("consultation_requests")
    .update({
      status: "declined",
      decline_reason: reason,
      assigned_nurse_id: actor.userId,
      assigned_nurse_name: actor.fullName,
      queue_ticket_id: null,
      queue_number: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (error) mapError(error)

  await appendTimeline(
    supabase,
    input.id,
    "Declined",
    reason,
    actor.userId,
    actor.fullName
  )
  await appendAudit(
    supabase,
    input.id,
    "declined_by",
    reason,
    actor.userId,
    actor.fullName
  )

  return getConsultationRequestById(input.id, supabase)
}

export async function rescheduleConsultationRequestRecord(
  input: RescheduleConsultationRequestInput,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.reschedule")) {
    throw new ConsultationRequestServiceError(
      "permission",
      "Only nurses can reschedule consultation requests."
    )
  }

  const reason = input.reason.trim()
  if (!reason) {
    throw new ConsultationRequestServiceError(
      "validation",
      "A reschedule reason is required."
    )
  }
  if (!input.preferredDate.trim() || !input.preferredTime.trim()) {
    throw new ConsultationRequestServiceError(
      "validation",
      "New date and time are required."
    )
  }

  const supabase = await getClient(client)
  const existing = await getConsultationRequestById(input.id, supabase)

  let reserved
  try {
    reserved = await reReserveConsultationRequestDate(
      {
        requestId: existing.id,
        providerType: existing.providerType,
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime,
        patientName: existing.patientName,
        studentId: existing.studentId,
        reason: existing.reason,
        actorId: actor.userId,
        actorName: actor.fullName,
      },
      supabase
    )
  } catch (error) {
    throw new ConsultationRequestServiceError(
      "database",
      error instanceof Error ? error.message : "Failed to re-reserve the date."
    )
  }

  const { error } = await supabase
    .from("consultation_requests")
    .update({
      status: reserved.status === "waitlisted" ? "waitlisted" : "rescheduled",
      preferred_date: input.preferredDate,
      preferred_time: input.preferredTime,
      reschedule_reason: reason,
      assigned_nurse_id: actor.userId,
      assigned_nurse_name: actor.fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (error) mapError(error)

  const remarks = `New schedule ${input.preferredDate} ${input.preferredTime}. ${reason}${
    reserved.queueNumber != null
      ? ` · Queue #${reserved.queueNumber}`
      : " · Waitlisted"
  }`
  await appendTimeline(
    supabase,
    input.id,
    "Rescheduled",
    remarks,
    actor.userId,
    actor.fullName
  )
  await appendAudit(
    supabase,
    input.id,
    "rescheduled_by",
    remarks,
    actor.userId,
    actor.fullName
  )

  return getConsultationRequestById(input.id, supabase)
}

export async function updateConsultationRequestStatus(
  input: UpdateConsultationRequestStatusInput,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const actor = await requireStaffActor()
  if (!isStatus(input.status)) {
    throw new ConsultationRequestServiceError("validation", "Invalid status.")
  }

  const supabase = await getClient(client)
  const { error } = await supabase
    .from("consultation_requests")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (error) mapError(error)

  const label =
    input.status.charAt(0).toUpperCase() + input.status.slice(1).replace("_", " ")
  await appendTimeline(
    supabase,
    input.id,
    label,
    input.remarks?.trim() || `Status changed to ${input.status}.`,
    actor.userId,
    actor.fullName
  )
  await appendAudit(
    supabase,
    input.id,
    `${input.status}_by`,
    input.remarks?.trim() || null,
    actor.userId,
    actor.fullName
  )

  return getConsultationRequestById(input.id, supabase)
}

export async function addConsultationRequestNote(
  requestId: string,
  body: string,
  client?: SupabaseClient
): Promise<ConsultationRequestNote> {
  const actor = await requireStaffActor()
  const trimmed = body.trim()
  if (!trimmed) {
    throw new ConsultationRequestServiceError(
      "validation",
      "Note body is required."
    )
  }

  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultation_request_notes")
    .insert({
      request_id: requestId,
      body: trimmed,
      author_id: actor.userId,
      author_name: actor.fullName,
    })
    .select("*")
    .single()

  if (error) mapError(error)

  await appendAudit(
    supabase,
    requestId,
    "note_added",
    "Internal note added",
    actor.userId,
    actor.fullName
  )

  return {
    id: data.id as string,
    requestId: data.request_id as string,
    body: data.body as string,
    authorId: (data.author_id as string | null) ?? null,
    authorName: (data.author_name as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

export async function updateConsultationRequestNote(
  noteId: string,
  body: string,
  client?: SupabaseClient
): Promise<ConsultationRequestNote> {
  const actor = await requireStaffActor()
  const trimmed = body.trim()
  if (!trimmed) {
    throw new ConsultationRequestServiceError(
      "validation",
      "Note body is required."
    )
  }

  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultation_request_notes")
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select("*")
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError("not_found", "Note not found.")
  }

  await appendAudit(
    supabase,
    data.request_id as string,
    "note_edited",
    "Internal note edited",
    actor.userId,
    actor.fullName
  )

  return {
    id: data.id as string,
    requestId: data.request_id as string,
    body: data.body as string,
    authorId: (data.author_id as string | null) ?? null,
    authorName: (data.author_name as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

export async function deleteConsultationRequestNote(
  noteId: string,
  client?: SupabaseClient
): Promise<{ id: string; requestId: string }> {
  const actor = await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("consultation_request_notes")
    .select("id, request_id")
    .eq("id", noteId)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError("not_found", "Note not found.")
  }

  const { error: deleteError } = await supabase
    .from("consultation_request_notes")
    .delete()
    .eq("id", noteId)

  if (deleteError) mapError(deleteError)

  await appendAudit(
    supabase,
    data.request_id as string,
    "note_deleted",
    "Internal note deleted",
    actor.userId,
    actor.fullName
  )

  return { id: noteId, requestId: data.request_id as string }
}
