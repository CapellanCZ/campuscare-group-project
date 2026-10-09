"use client"

import {
  fetchPatientRecordStatsAction,
  searchPatientRecordsAction,
} from "@/features/patients/actions"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  patientsCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"
import type {
  PatientRecordListResult,
  PatientRecordStats,
} from "@/types/patientRecord"

export type PatientsPageBundle = {
  list: PatientRecordListResult
  stats: PatientRecordStats
}

const PAGE_SIZE = 20

export function getCachedPatients(
  role: ClinicDesignation
): PatientsPageBundle | null {
  return staffCacheGet<PatientsPageBundle>(patientsCacheKey(role))
}

export function savePatientsCache(
  role: ClinicDesignation,
  bundle: PatientsPageBundle
) {
  staffCacheSet(patientsCacheKey(role), bundle)
}

export async function loadPatientsBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<PatientsPageBundle> {
  return staffCacheLoad(
    patientsCacheKey(role),
    async () => {
      const [listResult, statsResult] = await Promise.all([
        searchPatientRecordsAction("", {
          page: 1,
          pageSize: PAGE_SIZE,
          patientType: "all",
          sortBy: "patient",
          sortDir: "asc",
        }),
        fetchPatientRecordStatsAction(),
      ])
      if (!listResult.ok) throw new Error(listResult.error)
      if (!statsResult.ok) throw new Error(statsResult.error)
      return { list: listResult.data, stats: statsResult.data }
    },
    options
  )
}

export function prefetchPatientsPage(role: ClinicDesignation) {
  void loadPatientsBundle(role)
}
