"use client"

import { useEffect, useEffectEvent } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { subscribeTables } from "@/lib/health/realtime"

const DEFAULT_DEBOUNCE_MS = 300

/**
 * Silently refresh staff UIs when listed tables change.
 * Default: router.refresh() for RSC-backed pages.
 */
export function useStaffRealtimeRefresh(
  channelName: string,
  tables: readonly string[],
  onChange?: () => void,
  debounceMs = DEFAULT_DEBOUNCE_MS
) {
  const router = useRouter()
  const onChangeEvent = useEffectEvent(() => {
    if (onChange) {
      onChange()
      return
    }
    router.refresh()
  })

  const tablesKey = tables.join(",")

  useEffect(() => {
    if (!tablesKey) return

    const client = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        onChangeEvent()
      }, debounceMs)
    }

    const channel = subscribeTables(
      client,
      channelName,
      tablesKey.split(","),
      schedule
    )

    return () => {
      if (timer) clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [channelName, tablesKey, debounceMs])
}

/** Convenience: default router.refresh when tables change. */
export function useStaffRealtimeRouterRefresh(
  channelName: string,
  tables: readonly string[],
  debounceMs = DEFAULT_DEBOUNCE_MS
) {
  useStaffRealtimeRefresh(channelName, tables, undefined, debounceMs)
}
