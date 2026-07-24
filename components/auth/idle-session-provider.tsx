"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { IdleSessionWarning } from "@/components/auth/idle-session-warning"
import {
  absoluteDeadline,
  clearSessionStartedAt,
  getSessionTimeoutPhase,
  idleDeadline,
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

type LogoutReason = "idle" | "absolute"

export function IdleSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const lastActivityAtRef = useRef(Date.now())
  const sessionStartedAtRef = useRef<number | null>(null)
  const loggingOutRef = useRef(false)
  const [phase, setPhase] = useState<SessionTimeoutPhase>("active")
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  const forceSignOut = useCallback((reason: LogoutReason) => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    clearSessionStartedAt(window.sessionStorage)
    window.location.assign(`/auth/logout?reason=${reason}`)
  }, [])

  const staySignedIn = useCallback(() => {
    lastActivityAtRef.current = Date.now()
    setPhase("active")
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
      const at = Date.now()
      // Throttle noisy pointer events.
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
      const nextPhase = getSessionTimeoutPhase({
        now: checkAt,
        lastActivityAt: lastActivityAtRef.current,
        sessionStartedAt,
      })

      setPhase(nextPhase)

      if (nextPhase === "warning") {
        setSecondsRemaining(
          secondsUntil(idleDeadline(lastActivityAtRef.current), checkAt)
        )
      }

      if (nextPhase === "expired") {
        const reason: LogoutReason =
          checkAt >= absoluteDeadline(sessionStartedAt) ? "absolute" : "idle"
        forceSignOut(reason)
      }
    }, SESSION_CHECK_INTERVAL_MS)

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity)
      }
      window.clearInterval(intervalId)
    }
  }, [forceSignOut])

  return (
    <>
      {children}
      <IdleSessionWarning
        open={phase === "warning"}
        secondsRemaining={secondsRemaining}
        onStaySignedIn={staySignedIn}
        onSignOut={() => forceSignOut("idle")}
      />
    </>
  )
}
