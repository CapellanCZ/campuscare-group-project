/**
 * Keep previous directory rows visible while a refetch runs.
 * Only show a full skeleton on the true empty/first-load case.
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

export function staleListBusyClassName(isRefreshing: boolean) {
  return isRefreshing
    ? "opacity-60 transition-opacity duration-150"
    : "opacity-100 transition-opacity duration-150"
}
