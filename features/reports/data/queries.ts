import {
  applyReportsFilters,
  defaultFiltersFor,
} from "@/features/reports/data/apply-filters"
import {
  SEED_CERTS,
  SEED_CONSULTS,
  SEED_QUEUE_DAYS,
  SEED_REQUESTS,
  type ReportsDataset,
} from "@/features/reports/data/datasets"
import { loadLiveReportsDataset } from "@/features/reports/data/load-live-dataset"
import type { ReportFilters, ReportsBundle } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

export { applyReportsFilters, defaultFiltersFor } from "@/features/reports/data/apply-filters"

const DEMO_DATASET: ReportsDataset = {
  consults: SEED_CONSULTS,
  certs: SEED_CERTS,
  requests: SEED_REQUESTS,
  queueDays: SEED_QUEUE_DAYS,
}

/**
 * Prefer live clinic rows when the campus has meaningful activity.
 * Otherwise fall back to the local demo dataset so the Reports UI
 * matches the designed layout (charts, tabs, tables) for demos.
 */
function pickDataset(live: ReportsDataset): {
  dataset: ReportsDataset
  source: ReportsBundle["source"]
} {
  const liveWeight =
    live.consults.length + live.certs.length + live.queueDays.length

  if (liveWeight >= 8) {
    return { dataset: live, source: "live" }
  }

  // Blend: keep any real rows, fill the rest from demo structure (not screenshot copy).
  if (liveWeight > 0) {
    return {
      dataset: {
        consults: live.consults.length ? live.consults : DEMO_DATASET.consults,
        certs: live.certs.length ? live.certs : DEMO_DATASET.certs,
        requests: live.requests.length ? live.requests : DEMO_DATASET.requests,
        queueDays: live.queueDays.length
          ? live.queueDays
          : DEMO_DATASET.queueDays,
      },
      source: "live+seed",
    }
  }

  return { dataset: DEMO_DATASET, source: "seed" }
}

export async function loadReportsBundle(
  designation: ClinicDesignation,
  filters?: Partial<ReportFilters>
): Promise<ReportsBundle> {
  const base = defaultFiltersFor(designation)
  const merged: ReportFilters = { ...base, ...filters }

  let liveDataset: ReportsDataset = {
    consults: [],
    certs: [],
    requests: [],
    queueDays: [],
  }
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

  const picked = pickDataset(liveDataset)
  const applied = applyReportsFilters(
    designation,
    merged,
    live,
    picked.dataset
  )

  return {
    ...applied,
    generatedAt: new Date().toISOString(),
    source: picked.source,
    live,
    dataset: picked.dataset,
    error,
  }
}
