/**
 * Keep previous directory rows fully visible while a refetch runs.
 * Skeleton only the data list when there is nothing to show yet.
 */
export function staleListBusy(
  loading: boolean,
  rowCount: number,
  pending = false
) {
  const hasRows = rowCount > 0
  const busy = loading || pending
  return {
    hasRows,
    showInitialSkeleton: busy && !hasRows,
    isRefreshing: busy && hasRows,
  }
}

/** Kept for call sites — do not dim static/previous rows. */
export function staleListBusyClassName(_isRefreshing: boolean) {
  return "opacity-100"
}
