"use client"

import {
  fetchConsultationStatsAction,
  listConsultationFilterOptionsAction,
  searchConsultationsAction,
} from "@/features/consultations/actions"
import {
  consultationsCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"
import type { ClinicDesignation } from "@/lib/auth/types"
import type {
  ConsultationListResult,
  ConsultationStats,
} from "@/types/consultation"

export type ConsultationsPageBundle = {
  list: ConsultationListResult
  stats: ConsultationStats
  providers: string[]
  stations: string[]
}

const PAGE_SIZE = 20

function defaultStation(role: ClinicDesignation): string {
  if (role === "dentist") return "dentist"
  if (role === "physician") return "physician"
  return "all"
}

export function getCachedConsultations(
  role: ClinicDesignation
): ConsultationsPageBundle | null {
  return staffCacheGet<ConsultationsPageBundle>(consultationsCacheKey(role))
}

export function saveConsultationsCache(
  role: ClinicDesignation,
  bundle: ConsultationsPageBundle
) {
  staffCacheSet(consultationsCacheKey(role), bundle)
}

export async function loadConsultationsBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<ConsultationsPageBundle> {
  return staffCacheLoad(
    consultationsCacheKey(role),
    async () => {
      const [listResult, statsResult, optionsResult] = await Promise.all([
        searchConsultationsAction("", {
          page: 1,
          pageSize: PAGE_SIZE,
          status: "all",
          provider: "all",
          station: defaultStation(role),
          consultationDate: "all",
        }),
        fetchConsultationStatsAction(),
        listConsultationFilterOptionsAction(),
      ])

      if (!listResult.ok) throw new Error(listResult.error)
      if (!statsResult.ok) throw new Error(statsResult.error)

      return {
        list: listResult.data,
        stats: statsResult.data,
        providers: optionsResult.ok ? optionsResult.data.providers : [],
        stations: optionsResult.ok ? optionsResult.data.stations : [],
      }
    },
    options
  )
}

/** Warm consultations list before the nav click lands. */
export function prefetchConsultationsPage(role: ClinicDesignation) {
  void loadConsultationsBundle(role)
}
