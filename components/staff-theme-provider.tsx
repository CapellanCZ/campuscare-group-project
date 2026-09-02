"use client"

import { useEffect, useLayoutEffect, useRef } from "react"

import { useTheme } from "@/components/theme-provider"
import { useStaffThemeToggle } from "@/hooks/use-staff-theme-toggle"
import {
  clearLegacyThemeStorage,
  readStaffThemeFromStorage,
  type ThemePreference,
  writeStaffThemeToStorage,
} from "@/lib/theme/staff-theme-storage"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function StaffThemeHotkey() {
  const { toggleTheme } = useStaffThemeToggle()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if ((event.key ?? "").toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      toggleTheme()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleTheme])

  return null
}

/** Applies the signed-in user's theme without sharing state across accounts. */
export function StaffThemeController({
  userId,
  initialTheme,
  children,
}: {
  userId: string
  initialTheme: ThemePreference
  children: React.ReactNode
}) {
  const { setTheme } = useTheme()
  const appliedUserIdRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    clearLegacyThemeStorage()

    const switchedAccount = appliedUserIdRef.current !== userId
    if (!switchedAccount) {
      return
    }

    const stored = readStaffThemeFromStorage(userId)
    const next = stored ?? initialTheme
    writeStaffThemeToStorage(userId, next)
    setTheme(next)
    appliedUserIdRef.current = userId
  }, [userId, initialTheme, setTheme])

  return (
    <>
      <StaffThemeHotkey />
      {children}
    </>
  )
}
