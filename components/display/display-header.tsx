"use client"

import { useEffect, useState } from "react"

import { signOut } from "@/app/auth/actions"
import { CampusCareLogo } from "@/components/campuscare-logo"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatClock, formatLongDate, formatResumeClock } from "@/lib/health/time"
import { IconCoffee, IconUsers, IconVolume, IconVolumeOff } from "@tabler/icons-react"

export function DisplayHeader({
  totalWaiting,
  speakerOn,
  onToggleSpeaker,
  clinicOnBreak = false,
  clinicResumesAt = null,
}: {
  totalWaiting: number
  speakerOn: boolean
  onToggleSpeaker: () => void
  clinicOnBreak?: boolean
  clinicResumesAt?: string | null
}) {
  const [now, setNow] = useState(() => new Date())
  const [canLogout, setCanLogout] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const client = createClient()
    void client.auth.getUser().then(({ data }) => {
      setCanLogout(Boolean(data.user))
    })
  }, [])

  async function confirmLogout() {
    setLoggingOut(true)
    try {
      await signOut()
      window.location.assign("/login")
    } catch {
      setLoggingOut(false)
      setLogoutOpen(false)
    }
  }

  return (
    <header className="border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          {canLogout ? (
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="shrink-0 cursor-default border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Sign out of queue display"
            >
              <CampusCareLogo
                alt=""
                className="h-10 w-auto"
                width={64}
                height={40}
              />
            </button>
          ) : (
            <CampusCareLogo
              alt=""
              className="h-10 w-auto shrink-0"
              width={64}
              height={40}
            />
          )}
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

      {clinicOnBreak ? (
        <div
          role="status"
          className="border-t border-amber-500/30 bg-amber-500/15 px-4 py-3 text-center md:px-6"
        >
          <p className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold text-amber-950 dark:text-amber-100 md:text-lg">
            <IconCoffee className="size-5 shrink-0" aria-hidden />
            Clinic is on break
            {formatResumeClock(clinicResumesAt)
              ? ` · Resumes around ${formatResumeClock(clinicResumesAt)}`
              : " · Please wait"}
          </p>
        </div>
      ) : null}

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave queue display?</AlertDialogTitle>
            <AlertDialogDescription>
              This signs out the display account and returns to staff login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loggingOut}
              onClick={(event) => {
                event.preventDefault()
                void confirmLogout()
              }}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
