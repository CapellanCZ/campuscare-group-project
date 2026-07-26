"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatClock, formatLongDate } from "@/lib/health/time"
import { IconUsers, IconVolume, IconVolumeOff } from "@tabler/icons-react"

export function DisplayHeader({
  totalWaiting,
  speakerOn,
  onToggleSpeaker,
}: {
  totalWaiting: number
  speakerOn: boolean
  onToggleSpeaker: () => void
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <header className="border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/images/Heart.png"
            alt=""
            className="h-10 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Health Services Office
            </p>
            <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
              Patients Queue Display
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={speakerOn ? "Mute announcements" : "Enable announcements"}
            onClick={onToggleSpeaker}
          >
            {speakerOn ? <IconVolume /> : <IconVolumeOff />}
          </Button>

          <Card className="shadow-none dark:ring-0">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <IconUsers className="size-5 text-primary" aria-hidden />
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Total waiting
                </p>
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {totalWaiting}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="min-w-[9rem] text-right">
            <p className="font-mono text-3xl font-semibold tabular-nums leading-none">
              {formatClock(now)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatLongDate(now)}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
