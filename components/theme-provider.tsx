"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { TooltipProvider } from "@/components/ui/tooltip"
import {
  isPublicAppearancePath,
  PUBLIC_APPEARANCE_BOOTSTRAP,
} from "@/lib/theme/appearance-scope"
import { ACTIVE_THEME_STORAGE_KEY } from "@/lib/theme/staff-theme-storage"

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
  const pathname = usePathname()
  const isPublic = isPublicAppearancePath(pathname)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={!isPublic}
      forcedTheme={isPublic ? "light" : undefined}
      disableTransitionOnChange
      storageKey={ACTIVE_THEME_STORAGE_KEY}
      {...props}
    >
      <script dangerouslySetInnerHTML={{ __html: PUBLIC_APPEARANCE_BOOTSTRAP }} />
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  )
}

export { ThemeProvider, useTheme }
