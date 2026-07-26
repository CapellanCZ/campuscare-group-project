"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { DisplayHeader } from "@/components/display/display-header"
import { StationCard } from "@/components/display/station-card"
import { ReservedMediaSlot } from "@/components/display/reserved-media-slot"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { subscribeQueueChanges } from "@/lib/health/realtime"
import type { RecentlyServedItem, StationBoard } from "@/lib/health/types"
import { IconClock } from "@tabler/icons-react"

export function QueueDisplay({
  initialBoards,
  initialRecentlyServed,
  initialTotalWaiting,
}: {
  initialBoards: StationBoard[]
  initialRecentlyServed: RecentlyServedItem[]
  initialTotalWaiting: number
}) {
  const router = useRouter()
  const [boards, setBoards] = useState(initialBoards)
  const [recent, setRecent] = useState(initialRecentlyServed)
  const [totalWaiting, setTotalWaiting] = useState(initialTotalWaiting)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [lastAnnounced, setLastAnnounced] = useState<string | null>(null)

  useEffect(() => {
    setBoards(initialBoards)
    setRecent(initialRecentlyServed)
    setTotalWaiting(initialTotalWaiting)
  }, [initialBoards, initialRecentlyServed, initialTotalWaiting])

  const servingKey = useMemo(
    () =>
      boards
        .map((b) => `${b.station}:${b.nowServing ?? "-"}`)
        .join("|"),
    [boards]
  )

  useEffect(() => {
    if (!speakerOn || typeof window === "undefined") return
    const next = boards.find((b) => b.nowServing)?.nowServing
    if (!next || next === lastAnnounced) return
    setLastAnnounced(next)
    const station = boards.find((b) => b.nowServing === next)?.label ?? "clinic"
    const utterance = new SpeechSynthesisUtterance(
      `Now serving ticket ${next} at the ${station} station`
    )
    utterance.rate = 0.95
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [boards, speakerOn, lastAnnounced, servingKey])

  useEffect(() => {
    const client = createClient()
    const channel = subscribeQueueChanges(client, () => {
      router.refresh()
    })

    const poll = window.setInterval(() => router.refresh(), 15000)

    return () => {
      window.clearInterval(poll)
      void client.removeChannel(channel)
    }
  }, [router])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <DisplayHeader
        totalWaiting={totalWaiting}
        speakerOn={speakerOn}
        onToggleSpeaker={() => setSpeakerOn((v) => !v)}
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

        <ReservedMediaSlot />
      </main>
    </div>
  )
}
