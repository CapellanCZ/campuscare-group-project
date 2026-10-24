"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"

import { DisplayHeader } from "@/components/display/display-header"
import { RecentlyServedStrip } from "@/components/display/recently-served-strip"
import { StationCard } from "@/components/display/station-card"
import {
  persistSpeakerPreference,
  readSpeakerPreference,
  useQueueAnnouncements,
} from "@/components/display/use-queue-announcements"
import { fetchPublicQueueSnapshotAction } from "@/features/display/actions"
import {
  persistDisplayAppearance,
  QUEUE_DISPLAY_THEMES,
  readDisplayAppearance,
  type QueueDisplayAppearance,
} from "@/lib/display/appearance"
import { createClient } from "@/lib/supabase/client"
import { subscribeDisplayChanges } from "@/lib/health/realtime"
import type { BreakStatus } from "@/lib/availability/types"
import type { StationBoard } from "@/lib/health/types"

/**
 * Public TV board — transit-style call board with light/dark appearance.
 */
export function QueueDisplay({
  initialBoards,
  initialRecentlyServed,
  initialTotalWaiting,
  initialClinicBreak,
}: {
  initialBoards: StationBoard[]
  initialRecentlyServed: RecentlyServedItem[]
  initialTotalWaiting: number
  initialClinicBreak: BreakStatus
}) {
  const [boards, setBoards] = useState(initialBoards)
  const [recent, setRecent] = useState(initialRecentlyServed)
  const [totalWaiting, setTotalWaiting] = useState(initialTotalWaiting)
  const [clinicBreak, setClinicBreak] = useState(initialClinicBreak)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [appearance, setAppearance] =
    useState<QueueDisplayAppearance>("light")
  const refreshingRef = useRef(false)

  const applySnapshot = useCallback(
    (next: {
      boards: StationBoard[]
      recentlyServed: RecentlyServedItem[]
      totalWaiting: number
      clinicBreak: BreakStatus
    }) => {
      setBoards(next.boards)
      setRecent(next.recentlyServed)
      setTotalWaiting(next.totalWaiting)
      setClinicBreak(next.clinicBreak)
    },
    []
  )

  const softRefresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    try {
      const result = await fetchPublicQueueSnapshotAction()
      if (result.ok) applySnapshot(result.data)
    } finally {
      refreshingRef.current = false
    }
  }, [applySnapshot])

  useEffect(() => {
    setSpeakerOn(readSpeakerPreference())
    setAppearance(readDisplayAppearance())
  }, [])

  useEffect(() => {
    applySnapshot({
      boards: initialBoards,
      recentlyServed: initialRecentlyServed,
      totalWaiting: initialTotalWaiting,
      clinicBreak: initialClinicBreak,
    })
  }, [
    applySnapshot,
    initialBoards,
    initialRecentlyServed,
    initialTotalWaiting,
    initialClinicBreak,
  ])

  useQueueAnnouncements({
    boards,
    speakerOn,
    clinicOnBreak: clinicBreak.isOnBreak,
  })

  useEffect(() => {
    const client = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void softRefresh()
      }, 400)
    }

    const subscription = subscribeDisplayChanges(client, scheduleRefresh)
    const poll = window.setInterval(() => void softRefresh(), 2_500)

    return () => {
      if (timer) clearTimeout(timer)
      window.clearInterval(poll)
      subscription.unsubscribe(client)
    }
  }, [softRefresh])

  function handleToggleSpeaker() {
    setSpeakerOn((current) => {
      const next = !current
      persistSpeakerPreference(next)
      return next
    })
  }

  function handleToggleAppearance() {
    setAppearance((current) => {
      const next: QueueDisplayAppearance =
        current === "light" ? "dark" : "light"
      persistDisplayAppearance(next)
      return next
    })
  }

  const theme = QUEUE_DISPLAY_THEMES[appearance]

  return (
    <div
      className="flex min-h-dvh flex-col text-[var(--qd-fg)]"
      data-qd-appearance={appearance}
      style={
        {
          ...theme,
          background: "var(--qd-ink)",
        } as CSSProperties
      }
    >
      <DisplayHeader
        totalWaiting={totalWaiting}
        speakerOn={speakerOn}
        onToggleSpeaker={handleToggleSpeaker}
        appearance={appearance}
        onToggleAppearance={handleToggleAppearance}
        clinicOnBreak={clinicBreak.isOnBreak}
        clinicResumesAt={clinicBreak.resumesAt}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-1 bg-[var(--qd-panel)] lg:grid-cols-3">
          {boards.map((board, index) => (
            <StationCard
              key={board.station}
              board={board}
              isLast={index === boards.length - 1}
            />
          ))}
        </div>

        <RecentlyServedStrip items={recent} />
      </main>
    </div>
  )
}
