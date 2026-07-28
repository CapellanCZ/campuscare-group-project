"use server"

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
        error: "Unable to reach the database. Check your connection and try again.",
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

export async function fetchMedicalCertificatesAction(
  params: MedicalCertificateListParams = {}
): Promise<MedicalCertificateActionResult<MedicalCertificateListResult>> {
  try {
    const data = await getMedicalCertificates(params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function searchMedicalCertificatesAction(
  query: string,
  params: Omit<MedicalCertificateListParams, "query"> = {}
): Promise<MedicalCertificateActionResult<MedicalCertificateListResult>> {
  try {
    const data = await searchMedicalCertificates(query, params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchMedicalCertificateByIdAction(
  id: string
): Promise<MedicalCertificateActionResult<MedicalCertificate>> {
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
  try {
    const data = await getMedicalCertificateStats()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listCertificatePatientsAction(): Promise<
  MedicalCertificateActionResult<MedicalCertificatePatient[]>
> {
  try {
    const data = await listCertificatePatients()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function createMedicalCertificateAction(
  input: CreateMedicalCertificateInput
): Promise<MedicalCertificateActionResult<MedicalCertificate>> {
  try {
    const data = await createMedicalCertificate(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateMedicalCertificateAction(
  input: UpdateMedicalCertificateInput
): Promise<MedicalCertificateActionResult<MedicalCertificate>> {
  try {
    const data = await updateMedicalCertificate(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deleteMedicalCertificateAction(
  id: string
): Promise<MedicalCertificateActionResult<{ id: string }>> {
  try {
    await deleteMedicalCertificate(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return toErrorResult(error)
  }
}
