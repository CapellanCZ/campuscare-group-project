"use client"

import * as React from "react"

type ThemeName = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: ThemeName
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeName) => void
}

const STORAGE_KEY = "theme"
const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function readStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored
  }
  return "system"
}

function applyThemeClass(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeName>(() => readStoredTheme())
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    resolveSystemTheme()
  )
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : (theme as ResolvedTheme)

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (theme !== "system") return
      const next = resolveSystemTheme()
      setSystemTheme(next)
    }

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  React.useEffect(() => {
    applyThemeClass(resolvedTheme)
  }, [theme, resolvedTheme])

  const setTheme = React.useCallback((nextTheme: ThemeName) => {
    const safeTheme: ThemeName =
      nextTheme === "light" || nextTheme === "dark" || nextTheme === "system"
        ? nextTheme
        : "system"

    setThemeState(safeTheme)
    window.localStorage.setItem(STORAGE_KEY, safeTheme)

    const nextResolved =
      safeTheme === "system" ? resolveSystemTheme() : (safeTheme as ResolvedTheme)
    applyThemeClass(nextResolved)
  }, [])

  const contextValue = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

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

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const pressedKey =
        typeof event.key === "string" ? event.key.toLowerCase() : ""
      if (pressedKey !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    return {
      theme: "system" as ThemeName,
      resolvedTheme: "light" as ResolvedTheme,
      setTheme: () => {},
    }
  }
  return context
}
