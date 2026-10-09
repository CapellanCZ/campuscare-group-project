"use client"

import { fetchMedicalCertificateStatsAction } from "@/features/certificates/actions"
import { fetchMedicalDocumentsAction } from "@/features/medical-documents/actions"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  certificatesCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"
import type { MedicalCertificateStats } from "@/types/medicalCertificate"
import type { MedicalDocumentListResult } from "@/types/medicalDocument"

export type CertificatesPageBundle = {
  list: MedicalDocumentListResult
  stats: MedicalCertificateStats
}

const PAGE_SIZE = 10

export function getCachedCertificates(
  role: ClinicDesignation
): CertificatesPageBundle | null {
  return staffCacheGet<CertificatesPageBundle>(certificatesCacheKey(role))
}

export function saveCertificatesCache(
  role: ClinicDesignation,
  bundle: CertificatesPageBundle
) {
  staffCacheSet(certificatesCacheKey(role), bundle)
}

export async function loadCertificatesBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<CertificatesPageBundle> {
  return staffCacheLoad(
    certificatesCacheKey(role),
    async () => {
      const [listResult, statsResult] = await Promise.all([
        fetchMedicalDocumentsAction({
          query: "",
          page: 1,
          pageSize: PAGE_SIZE,
          documentType: "all",
          status: "all",
        }),
        fetchMedicalCertificateStatsAction(),
      ])
      if (!listResult.ok) throw new Error(listResult.error)
      if (!statsResult.ok) throw new Error(statsResult.error)
      return { list: listResult.data, stats: statsResult.data }
    },
    options
  )
}

export function prefetchCertificatesPage(role: ClinicDesignation) {
  void loadCertificatesBundle(role)
}
