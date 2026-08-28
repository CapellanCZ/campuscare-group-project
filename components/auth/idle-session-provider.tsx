"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { IdleSessionWarning } from "@/components/auth/idle-session-warning"
import { SessionLockOverlay } from "@/components/auth/session-lock-overlay"
import { cn } from "@/lib/utils"
import {
  clearSessionStartedAt,
  getSessionTimeoutPhase,
  isAbsoluteSessionExpired,
  lockDeadline,
  readSessionStartedAt,
  secondsUntil,
  SESSION_CHECK_INTERVAL_MS,
  type SessionTimeoutPhase,
} from "@/lib/auth/session-timeout"

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const

export function IdleSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const lastActivityAtRef = useRef(Date.now())
  const sessionStartedAtRef = useRef<number | null>(null)
  const loggingOutRef = useRef(false)
  const phaseRef = useRef<SessionTimeoutPhase>("active")
  const [phase, setPhase] = useState<SessionTimeoutPhase>("active")
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  const forceAbsoluteSignOut = useCallback(() => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    clearSessionStartedAt(window.sessionStorage)
    window.location.assign("/auth/logout?reason=absolute")
  }, [])

  const continueSession = useCallback(() => {
    lastActivityAtRef.current = Date.now()
    setPhase("active")
    phaseRef.current = "active"
    setSecondsRemaining(0)
  }, [])

  useEffect(() => {
    const now = Date.now()
    sessionStartedAtRef.current = readSessionStartedAt(
      window.sessionStorage,
      now
    )
    lastActivityAtRef.current = now

    const markActivity = () => {
      if (loggingOutRef.current) return
      if (phaseRef.current !== "active") return
      const at = Date.now()
      if (at - lastActivityAtRef.current < 1000) return
      lastActivityAtRef.current = at
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, { passive: true })
    }

    const intervalId = window.setInterval(() => {
      if (loggingOutRef.current) return

      const checkAt = Date.now()
      const sessionStartedAt = sessionStartedAtRef.current ?? checkAt

      if (
        isAbsoluteSessionExpired({ now: checkAt, sessionStartedAt })
      ) {
        forceAbsoluteSignOut()
        return
      }

      const nextPhase = getSessionTimeoutPhase({
        now: checkAt,
        lastActivityAt: lastActivityAtRef.current,
        sessionStartedAt,
      })

      setPhase(nextPhase)
      phaseRef.current = nextPhase

      if (nextPhase === "warning") {
        setSecondsRemaining(
          secondsUntil(lockDeadline(lastActivityAtRef.current), checkAt)
        )
      }
    }, SESSION_CHECK_INTERVAL_MS)

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity)
      }
      window.clearInterval(intervalId)
    }
  }, [forceAbsoluteSignOut])

  const isLocked = phase === "locked"

  return (
    <>
      <div
        className={cn(
          isLocked && "pointer-events-none select-none",
          "contents"
        )}
      >
        {children}
      </div>
      <IdleSessionWarning
        open={phase === "warning"}
        secondsRemaining={secondsRemaining}
        onContinueSession={continueSession}
      />
      {isLocked ? (
        <SessionLockOverlay onContinue={continueSession} />
      ) : null}
    </>
  )
}
