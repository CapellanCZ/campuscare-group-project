"use server"

import { ensureDentalDocumentWorkspace } from "@/features/dentist/data/load-dental-document-workspace"
import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"

export type DentalDocumentWorkspaceResult =
  | { ok: true; data: ClinicalVisitWorkspace }
  | { ok: false; error: string }

export async function loadDentalDocumentWorkspaceAction(
  appointmentId: string
): Promise<DentalDocumentWorkspaceResult> {
  return ensureDentalDocumentWorkspace(appointmentId)
}
