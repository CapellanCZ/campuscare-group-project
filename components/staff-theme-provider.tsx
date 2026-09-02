"use client"

import { useLayoutEffect } from "react"

import { useTheme } from "@/components/theme-provider"
import {
  clearLegacyThemeStorage,
  type ThemePreference,
  writeStaffThemeToStorage,
} from "@/lib/theme/staff-theme-storage"

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

  useLayoutEffect(() => {
    clearLegacyThemeStorage()
    writeStaffThemeToStorage(userId, initialTheme)
    setTheme(initialTheme)
  }, [userId, initialTheme, setTheme])

  return children
}
