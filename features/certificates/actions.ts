"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { can } from "@/lib/auth/permissions"
import {
  createMedicalCertificate,
  deleteMedicalCertificate,
  getMedicalCertificateById,
  getMedicalCertificates,
  getMedicalCertificateStats,
  listCertificatePatients,
  searchMedicalCertificates,
  updateMedicalCertificate,
} from "@/services/medicalCertificates"
import type { StaffAccess } from "@/lib/auth/types"
import {
  MedicalCertificateServiceError,
  type CreateMedicalCertificateInput,
  type MedicalCertificate,
  type MedicalCertificateListParams,
  type MedicalCertificateListResult,
  type MedicalCertificatePatient,
  type MedicalCertificateStats,
  type UpdateMedicalCertificateInput,
} from "@/types/medicalCertificate"

/** Physicians/dentists only see certificates they issued; nurse/admin see all. */
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
  params: MedicalCertificateListParams = {}
): MedicalCertificateListParams {
  const issuedBy = issuerScopeUserId(access)
  if (issuedBy) {
    return { ...params, issuedBy }
  }
  const { issuedBy: _ignored, ...rest } = params
  return rest
}

export type MedicalCertificateActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(
  error: unknown
): MedicalCertificateActionResult<never> {
  if (error instanceof MedicalCertificateServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return {
        ok: false,
        error:
          "Unable to reach the database. Check your connection and try again.",
        code: "offline",
      }
    }
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading medical certificates.",
    code: "unknown",
  }
}

async function requireCertificateAccess(mutate = false) {
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
      error: "You do not have permission to issue medical certificates.",
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
      error: "You do not have permission to access medical certificates.",
      code: "permission",
    }
  }
  return { ok: true as const, access }
}

export async function fetchMedicalCertificatesAction(
  params: MedicalCertificateListParams = {}
): Promise<MedicalCertificateActionResult<MedicalCertificateListResult>> {
  const auth = await requireCertificateAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await getMedicalCertificates(
      withIssuerScope(auth.access, params)
    )
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function searchMedicalCertificatesAction(
  query: string,
  params: Omit<MedicalCertificateListParams, "query"> = {}
): Promise<MedicalCertificateActionResult<MedicalCertificateListResult>> {
  const auth = await requireCertificateAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await searchMedicalCertificates(
      query,
      withIssuerScope(auth.access, params)
    )
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchMedicalCertificateByIdAction(
  id: string
): Promise<MedicalCertificateActionResult<MedicalCertificate>> {
  const auth = await requireCertificateAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await getMedicalCertificateById(id)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchMedicalCertificateStatsAction(): Promise<
  MedicalCertificateActionResult<MedicalCertificateStats>
> {
  const auth = await requireCertificateAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await getMedicalCertificateStats(
      issuerScopeUserId(auth.access)
    )
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listCertificatePatientsAction(): Promise<
  MedicalCertificateActionResult<MedicalCertificatePatient[]>
> {
  const auth = await requireCertificateAccess(false)
  if (!auth.ok) return auth
  try {
    const data = await listCertificatePatients()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function createMedicalCertificateAction(
  input: Omit<CreateMedicalCertificateInput, "issuedBy">
): Promise<MedicalCertificateActionResult<MedicalCertificate>> {
  const auth = await requireCertificateAccess(true)
  if (!auth.ok) return auth
  try {
    const { status: _status, ...rest } = input
    const data = await createMedicalCertificate({
      ...rest,
      issuedBy: auth.access.userId,
    })
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateMedicalCertificateAction(
  input: UpdateMedicalCertificateInput
): Promise<MedicalCertificateActionResult<MedicalCertificate>> {
  const auth = await requireCertificateAccess(true)
  if (!auth.ok) return auth
  try {
    const { status: _status, ...rest } = input
    const data = await updateMedicalCertificate(rest)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deleteMedicalCertificateAction(
  id: string
): Promise<MedicalCertificateActionResult<{ id: string }>> {
  const auth = await requireCertificateAccess(true)
  if (!auth.ok) return auth
  try {
    await deleteMedicalCertificate(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return toErrorResult(error)
  }
}
