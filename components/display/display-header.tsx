"use client"

import { useEffect, useState } from "react"
import {
  IconCoffee,
  IconMoon,
  IconSun,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react"

import { signOut } from "@/app/auth/actions"
import { CampusCareLogoStatic } from "@/components/campuscare-logo-static"
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
import type { QueueDisplayAppearance } from "@/lib/display/appearance"
import { createClient } from "@/lib/supabase/client"
import { formatClock, formatLongDate, formatResumeClock } from "@/lib/health/time"

export function DisplayHeader({
  totalWaiting,
  speakerOn,
  onToggleSpeaker,
  appearance,
  onToggleAppearance,
  clinicOnBreak = false,
  clinicResumesAt = null,
}: {
  totalWaiting: number
  speakerOn: boolean
  onToggleSpeaker: () => void
  appearance: QueueDisplayAppearance
  onToggleAppearance: () => void
  clinicOnBreak?: boolean
  clinicResumesAt?: string | null
}) {
  const [now, setNow] = useState(() => new Date())
  const [canLogout, setCanLogout] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const isDark = appearance === "dark"

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
      await signOut({ force: true })
      window.location.replace("/login")
    } catch {
      setLoggingOut(false)
      setLogoutOpen(false)
    }
  }

  const logo = (
    <CampusCareLogoStatic
      variant={isDark ? "white" : "blue"}
      alt="CampusCare"
      className="h-9 w-auto opacity-95 sm:h-10"
      width={152}
      priority
    />
  )

  return (
    <header className="shrink-0 border-b border-[var(--qd-line)] bg-[var(--qd-ink)]">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-5">
          {canLogout ? (
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="shrink-0 cursor-default border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--qd-signal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qd-ink)]"
              aria-label="Sign out of queue display"
            >
              {logo}
            </button>
          ) : (
            <div className="shrink-0">{logo}</div>
          )}
          <div className="hidden min-w-0 sm:block">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[var(--qd-mute)] uppercase">
              Health Services Office
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--qd-fg-soft)]">
              Public queue board
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 rounded-lg text-[var(--qd-fg-soft)] hover:bg-[var(--qd-control)] hover:text-[var(--qd-fg)]"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={onToggleAppearance}
          >
            {isDark ? (
              <IconSun className="size-5" />
            ) : (
              <IconMoon className="size-5" />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 rounded-lg text-[var(--qd-fg-soft)] hover:bg-[var(--qd-control)] hover:text-[var(--qd-fg)]"
            aria-label={speakerOn ? "Mute announcements" : "Enable announcements"}
            onClick={onToggleSpeaker}
          >
            {speakerOn ? (
              <IconVolume className="size-5" />
            ) : (
              <IconVolumeOff className="size-5" />
            )}
          </Button>

          <div
            className="hidden h-10 w-px bg-[var(--qd-line)] sm:block"
            aria-hidden
          />

          <div className="text-right">
            <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--qd-mute)] uppercase">
              Waiting
            </p>
            <p className="font-mono text-2xl font-semibold text-[var(--qd-ticket)] tabular-nums sm:text-3xl">
              {totalWaiting}
            </p>
          </div>

          <div
            className="hidden h-10 w-px bg-[var(--qd-line)] sm:block"
            aria-hidden
          />

          <div className="min-w-[7.5rem] text-right sm:min-w-[9rem]">
            <p className="font-mono text-2xl font-semibold tracking-tight text-[var(--qd-fg)] tabular-nums sm:text-3xl">
              {formatClock(now)}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--qd-mute)]">
              {formatLongDate(now)}
            </p>
          </div>
        </div>
      </div>

      {clinicOnBreak ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 border-t border-[var(--qd-break)]/40 bg-[var(--qd-break)] px-4 py-3 text-center"
        >
          <IconCoffee
            className="size-5 shrink-0 text-[#0C1222]"
            aria-hidden
          />
          <p className="text-base font-semibold text-[#0C1222] sm:text-lg">
            Clinic on break
            {formatResumeClock(clinicResumesAt)
              ? ` · resumes around ${formatResumeClock(clinicResumesAt)}`
              : " · please wait"}
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
