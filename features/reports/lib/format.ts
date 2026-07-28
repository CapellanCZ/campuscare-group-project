import type { ReportRange } from "@/types/report"

export function reportRangeLabel(range: ReportRange) {
  if (range === "7d") return "Last 7 days"
  if (range === "90d") return "Last 90 days"
  return "Last 30 days"
}

export function formatSharePercent(share: number) {
  if (!Number.isFinite(share) || share <= 0) return "0%"
  return `${Math.round(share * 100)}%`
}
