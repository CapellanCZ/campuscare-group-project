"use client"

import { useTransition } from "react"

import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { useTheme } from "@/components/theme-provider"
import { saveThemePreferenceAction } from "@/features/settings/actions"
import { appToast } from "@/lib/feedback/app-toast"
import {
  type ThemePreference,
  writeStaffThemeToStorage,
} from "@/lib/theme/staff-theme-storage"

export function useStaffThemeToggle() {
  const access = useOptionalStaffAccess()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [pending, startTransition] = useTransition()
  const isDark = (resolvedTheme ?? theme) === "dark"

  function applyTheme(next: ThemePreference) {
    setTheme(next)
    if (access?.userId) {
      writeStaffThemeToStorage(access.userId, next)
    }
  }

  function toggleTheme() {
    const next: ThemePreference = isDark ? "light" : "dark"
    applyTheme(next)
    startTransition(async () => {
      const result = await saveThemePreferenceAction(next)
      if (!result.ok) {
        appToast.error({
          title: "Unable to Save Preference",
          description: result.error,
        })
      }
    })
  }

  function setStaffTheme(next: ThemePreference) {
    applyTheme(next)
    startTransition(async () => {
      const result = await saveThemePreferenceAction(next)
      if (!result.ok) {
        appToast.error({
          title: "Unable to Save Preference",
          description: result.error,
        })
      }
    })
  }

  return { isDark, pending, toggleTheme, setStaffTheme }
}
