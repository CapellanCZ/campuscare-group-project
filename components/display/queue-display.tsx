"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { DisplayHeader } from "@/components/display/display-header"
import { StationCard } from "@/components/display/station-card"
import {
  persistSpeakerPreference,
  readSpeakerPreference,
  useQueueAnnouncements,
} from "@/components/display/use-queue-announcements"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchPublicQueueSnapshotAction } from "@/features/display/actions"
import { createClient } from "@/lib/supabase/client"
import { subscribeDisplayChanges } from "@/lib/health/realtime"
import type { BreakStatus } from "@/lib/availability/types"
import type { RecentlyServedItem, StationBoard } from "@/lib/health/types"
import { IconClock } from "@tabler/icons-react"

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
  // Local source of truth — soft-reconcile from public_queue_display, never blank.
  const [boards, setBoards] = useState(initialBoards)
  const [recent, setRecent] = useState(initialRecentlyServed)
  const [totalWaiting, setTotalWaiting] = useState(initialTotalWaiting)
  const [clinicBreak, setClinicBreak] = useState(initialClinicBreak)
  const [speakerOn, setSpeakerOn] = useState(true)
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
  }, [])

  // Seed from RSC once; after that local soft-refresh owns updates.
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
    const DEBOUNCE_MS = 400

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void softRefresh()
      }, DEBOUNCE_MS)
    }

    // Duty/break realtime + ticket poll from sanitized public view (no PHI).
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

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <DisplayHeader
        totalWaiting={totalWaiting}
        speakerOn={speakerOn}
        onToggleSpeaker={handleToggleSpeaker}
        clinicOnBreak={clinicBreak.isOnBreak}
        clinicResumesAt={clinicBreak.resumesAt}
      />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {boards.map((board) => (
            <StationCard key={board.station} board={board} />
          ))}
        </section>

        <section className="min-w-0 flex-1">
          <Card className="h-full shadow-none dark:ring-0">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconClock className="size-5" aria-hidden />
                Recently served
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-(--card-spacing) sm:grid-cols-2 xl:grid-cols-4">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
                  Completed tickets will appear here.
                </p>
              ) : (
                recent.map((item) => (
                  <RecentlyServedCard
                    key={item.ticketId}
                    item={item}
                    publicDisplay
                  />
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
