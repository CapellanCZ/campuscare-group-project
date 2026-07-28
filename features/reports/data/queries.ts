import {
  applyReportsFilters,
  defaultFiltersFor,
} from "@/features/reports/data/apply-filters"
import type { ReportFilters, ReportsBundle } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"
import { demoConsultationRequests } from "@/lib/demo/fixtures"
import {
  computeQueueStats,
  getTodayQueueTickets,
} from "@/lib/health/queue-queries"
import { getConsultationStats } from "@/services/consultations"
import { getMedicalCertificateStats } from "@/services/medicalCertificates"

export { applyReportsFilters, defaultFiltersFor } from "@/features/reports/data/apply-filters"

export async function loadReportsBundle(
  designation: ClinicDesignation,
  filters?: Partial<ReportFilters>
): Promise<ReportsBundle> {
  const base = defaultFiltersFor(designation)
  const merged: ReportFilters = { ...base, ...filters }

  let live = {
    completedToday: 0,
    walkIns: 0,
    avgWait: 0,
    pendingRequests: demoConsultationRequests.filter(
      (r) => r.status === "pending"
    ).length,
    certsToday: 0,
  }

  try {
    const [tickets, consultStats, certStats] = await Promise.all([
      getTodayQueueTickets().catch(() => []),
      getConsultationStats().catch(() => null),
      getMedicalCertificateStats().catch(() => null),
    ])
    const stats = computeQueueStats(tickets)
    live = {
      completedToday: consultStats?.completedToday ?? stats.completedToday,
      walkIns: stats.walkIns,
      avgWait: stats.averageWaitMinutes,
      pendingRequests: live.pendingRequests,
      certsToday: certStats?.issuedToday ?? 0,
    }
  } catch {
    // keep seed defaults
  }

  const applied = applyReportsFilters(designation, merged, live)

  return {
    ...applied,
    generatedAt: new Date().toISOString(),
    source: "live+seed",
  }
}
