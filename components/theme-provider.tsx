"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { TooltipProvider } from "@/components/ui/tooltip"

// next-themes injects an inline <script> to prevent theme flash (FOUC).
// React 19 warns about script tags inside components; the script still runs
// correctly during SSR — filter the known false-positive in development.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (
      typeof first === "string" &&
      first.includes("Encountered a script tag")
    ) {
      return
    }
    // Browser extensions inject fdprocessedid on buttons/inputs before hydration.
    const joined = args.map((arg) => String(arg)).join(" ")
    if (
      typeof first === "string" &&
      first.includes("Hydration") &&
      (joined.includes("native-dark-class") ||
        joined.includes("fdprocessedid"))
    ) {
      return
    }
    originalError.apply(console, args)
  }
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <TooltipProvider>
        <ThemeHotkey />
        {children}
      </TooltipProvider>
    </NextThemesProvider>
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

      if ((event.key ?? "").toLowerCase() !== "d") {
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

export { ThemeProvider, useTheme }
