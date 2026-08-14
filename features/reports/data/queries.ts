import {
  applyReportsFilters,
  defaultFiltersFor,
} from "@/features/reports/data/apply-filters"
import {
  EMPTY_REPORTS_DATASET,
  type ReportsDataset,
} from "@/features/reports/data/datasets"
import { loadLiveReportsDataset } from "@/features/reports/data/load-live-dataset"
import type { ReportFilters, ReportsBundle } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

export { applyReportsFilters, defaultFiltersFor } from "@/features/reports/data/apply-filters"

export async function loadReportsBundle(
  designation: ClinicDesignation,
  filters?: Partial<ReportFilters>
): Promise<ReportsBundle> {
  const base = defaultFiltersFor(designation)
  const merged: ReportFilters = { ...base, ...filters }

  // Admin uses dedicated aggregate loaders — never ship clinical row datasets.
  if (designation === "admin") {
    const applied = applyReportsFilters(
      designation,
      merged,
      {
        completedToday: 0,
        walkIns: 0,
        avgWait: 0,
        pendingRequests: 0,
        certsToday: 0,
      },
      EMPTY_REPORTS_DATASET
    )
    return {
      ...applied,
      generatedAt: new Date().toISOString(),
      source: "live",
      live: {
        completedToday: 0,
        walkIns: 0,
        avgWait: 0,
        pendingRequests: 0,
        certsToday: 0,
      },
      dataset: EMPTY_REPORTS_DATASET,
      error: null,
    }
  }

  let liveDataset: ReportsDataset = EMPTY_REPORTS_DATASET
  let live = {
    completedToday: 0,
    walkIns: 0,
    avgWait: 0,
    pendingRequests: 0,
    certsToday: 0,
  }
  let error: string | null = null

  try {
    const loaded = await loadLiveReportsDataset()
    liveDataset = loaded.dataset
    live = loaded.live
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Could not load clinic report data."
  }

  const applied = applyReportsFilters(
    designation,
    merged,
    live,
    liveDataset
  )

  return {
    ...applied,
    generatedAt: new Date().toISOString(),
    source: "live",
    live,
    dataset: liveDataset,
    error,
  }
}
