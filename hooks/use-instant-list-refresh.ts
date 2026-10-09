"use client"

import { useCallback, useRef } from "react"

/**
 * Coalesce bursty realtime events into one list reload without blocking UI.
 * Prefer patching local state on own mutations; use this for peer sync.
 */
export function useInstantListRefresh(
  reload: () => void | Promise<void>,
  debounceMs = 400
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void reloadRef.current()
    }, debounceMs)
  }, [debounceMs])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void reloadRef.current()
  }, [])

  return { schedule, flush }
}
