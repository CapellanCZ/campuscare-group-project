"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { can } from "@/lib/auth/permissions"
import {
  getMedicalDocumentById,
  getMedicalDocuments,
  getMedicalDocumentsByConsultation,
  issueMedicalDocument,
  logMedicalDocumentEvent,
  voidMedicalDocument,
} from "@/services/medicalDocuments"
import { getStaffProfile } from "@/services/staff-profile"
import type { StaffAccess } from "@/lib/auth/types"
import {
  MedicalDocumentServiceError,
  type IssueMedicalDocumentInput,
  type MedicalDocument,
  type MedicalDocumentListParams,
  type MedicalDocumentListResult,
} from "@/types/medicalDocument"

export type MedicalDocumentActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function issuerScopeUserId(access: StaffAccess): string | null {
  if (
    access.designation === "physician" ||
    access.designation === "dentist"
  ) {
    return access.userId
  }
  return null
}

function withIssuerScope(
  access: StaffAccess,
  params: MedicalDocumentListParams = {}
): MedicalDocumentListParams {
  const issuedBy = issuerScopeUserId(access)
  if (issuedBy) {
    return { ...params, issuedBy }
  }
  const { issuedBy: _ignored, ...rest } = params
  return rest
}

function toErrorResult(error: unknown): MedicalDocumentActionResult<never> {
  if (error instanceof MedicalDocumentServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading medical documents.",
    code: "unknown",
  }
}

async function requireDocumentAccess(mutate = false) {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    return {
      ok: false as const,
      error: "Sign in with an approved clinic account.",
      code: "permission",
    }
  }
  if (mutate && !can(access.designation, "certificates.generate")) {
    return {
      ok: false as const,
      error: "You do not have permission to issue medical documents.",
      code: "permission",
    }
  }
  if (
    !can(access.designation, "certificates.view_history") &&
    !can(access.designation, "certificates.generate") &&
    !can(access.designation, "certificates.summary_cards")
  ) {
    return {
      ok: false as const,
      error: "You do not have permission to access medical documents.",
      code: "permission",
    }
  }
  return { ok: true as const, access }
}

export async function fetchMedicalDocumentsAction(
  params: MedicalDocumentListParams = {}
): Promise<MedicalDocumentActionResult<MedicalDocumentListResult>> {
  const auth = await requireDocumentAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await getMedicalDocuments(withIssuerScope(auth.access, params))
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchMedicalDocumentsByConsultationAction(
  consultationId: string
): Promise<MedicalDocumentActionResult<MedicalDocument[]>> {
  const auth = await requireDocumentAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await getMedicalDocumentsByConsultation(consultationId)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchMedicalDocumentByIdAction(
  id: string
): Promise<MedicalDocumentActionResult<MedicalDocument>> {
  const auth = await requireDocumentAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await getMedicalDocumentById(id)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function issueMedicalDocumentAction(
  input: Omit<IssueMedicalDocumentInput, "issuedBy" | "doctorName" | "licenseNumber">
): Promise<MedicalDocumentActionResult<MedicalDocument>> {
  const auth = await requireDocumentAccess(true)
  if (!auth.ok) return auth
  try {
    const profile = await getStaffProfile(auth.access.userId)
    const data = await issueMedicalDocument({
      ...input,
      issuedBy: auth.access.userId,
      doctorName: profile?.fullName ?? auth.access.fullName,
      licenseNumber: profile?.licenseNumber ?? null,
    })
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function voidMedicalDocumentAction(input: {
  id: string
  reason: string
}): Promise<MedicalDocumentActionResult<MedicalDocument>> {
  const auth = await requireDocumentAccess(true)
  if (!auth.ok) return auth
  try {
    const data = await voidMedicalDocument({
      id: input.id,
      reason: input.reason,
      voidedBy: auth.access.userId,
      voidedByName: auth.access.fullName,
    })
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function logMedicalDocumentViewAction(
  documentId: string
): Promise<MedicalDocumentActionResult<{ ok: true }>> {
  const auth = await requireDocumentAccess(false)
  if (!auth.ok) return auth
  try {
    await logMedicalDocumentEvent({
      documentId,
      event: "VIEW_MEDICAL_DOCUMENT",
      actorId: auth.access.userId,
      actorName: auth.access.fullName,
    })
    return { ok: true, data: { ok: true } }
  } catch (error) {
    return toErrorResult(error)
  }
}
