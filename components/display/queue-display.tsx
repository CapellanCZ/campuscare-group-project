"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { DisplayHeader } from "@/components/display/display-header"
import { StationCard } from "@/components/display/station-card"
import {
  persistSpeakerPreference,
  readSpeakerPreference,
  useQueueAnnouncements,
} from "@/components/display/use-queue-announcements"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  const router = useRouter()
  const [boards, setBoards] = useState(initialBoards)
  const [recent, setRecent] = useState(initialRecentlyServed)
  const [totalWaiting, setTotalWaiting] = useState(initialTotalWaiting)
  const [clinicBreak, setClinicBreak] = useState(initialClinicBreak)
  const [speakerOn, setSpeakerOn] = useState(true)

  useEffect(() => {
    setSpeakerOn(readSpeakerPreference())
  }, [])

  useEffect(() => {
    setBoards(initialBoards)
    setRecent(initialRecentlyServed)
    setTotalWaiting(initialTotalWaiting)
    setClinicBreak(initialClinicBreak)
  }, [
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
    const channel = subscribeDisplayChanges(client, () => {
      router.refresh()
    })

    const poll = window.setInterval(() => router.refresh(), 15000)

    return () => {
      window.clearInterval(poll)
      void client.removeChannel(channel)
    }
  }, [router])

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
                <IconClock className="size-5" />
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
                  <RecentlyServedCard key={item.ticketId} item={item} />
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
