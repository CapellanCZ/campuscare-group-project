"use client"

import { useCallback, useTransition } from "react"

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
  const userId = access?.userId
  const isDark = (resolvedTheme ?? theme) === "dark"

  const persistTheme = useCallback(
    (next: ThemePreference) => {
      setTheme(next)
      if (!userId) return
      writeStaffThemeToStorage(userId, next)
      startTransition(async () => {
        const result = await saveThemePreferenceAction(next)
        if (!result.ok) {
          appToast.error({
            title: "Unable to Save Preference",
            description: result.error,
          })
        }
      })
    },
    [setTheme, startTransition, userId]
  )

  const toggleTheme = useCallback(() => {
    persistTheme(isDark ? "light" : "dark")
  }, [isDark, persistTheme])

  const setStaffTheme = useCallback(
    (next: ThemePreference) => {
      persistTheme(next)
    },
    [persistTheme]
  )

  return { isDark, pending, toggleTheme, setStaffTheme }
}
