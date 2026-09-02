export type ThemePreference = "light" | "dark" | "system"

export const ACTIVE_THEME_STORAGE_KEY = "campuscare-theme-active"

export function staffThemeStorageKey(userId: string) {
  return `campuscare-theme-${userId}`
}

export function readStaffThemeFromStorage(
  userId: string
): ThemePreference | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(staffThemeStorageKey(userId))
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  return null
}

export function writeStaffThemeToStorage(
  userId: string,
  theme: ThemePreference
) {
  localStorage.setItem(staffThemeStorageKey(userId), theme)
  localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, theme)
}

export function clearLegacyThemeStorage() {
  localStorage.removeItem("theme")
}

export function resetActiveThemeStorage(theme: ThemePreference = "light") {
  clearLegacyThemeStorage()
  localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, theme)
}
