/** Map clinic + queue status labels onto the report filter values. */
export function normalizeReportStatus(
  value: string | null | undefined
): string {
  const status = (value ?? "").trim().toLowerCase()
  if (!status || status === "all") return "all"
  if (
    status === "waiting" ||
    status === "awaiting assessment" ||
    status === "called"
  ) {
    return "waiting"
  }
  if (status === "ongoing" || status === "in progress") return "ongoing"
  if (status === "completed") return "completed"
  if (status === "cancelled" || status === "canceled") return "cancelled"
  return status
}

export function matchesReportStatus(
  status: string | null | undefined,
  filter: string
): boolean {
  if (!filter || filter === "all") return true
  return normalizeReportStatus(status) === normalizeReportStatus(filter)
}

export function isCancelledStatus(status: string | null | undefined): boolean {
  return normalizeReportStatus(status) === "cancelled"
}

export function isCompletedStatus(status: string | null | undefined): boolean {
  return normalizeReportStatus(status) === "completed"
}
