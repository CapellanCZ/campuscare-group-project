"use client"

import Link from "next/link"
import { IconBook, IconContrast } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

type SidebarUtilityFooterProps = {
  docsHref?: string
}

/** Icon-only theme + docs controls for the sidebar footer. */
export function SidebarUtilityFooter({
  docsHref = "/docs",
}: SidebarUtilityFooterProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Switch to ${nextTheme} mode`}
        onClick={() => setTheme(nextTheme)}
      >
        <IconContrast aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Open documentation"
        render={<Link href={docsHref} />}
        nativeButton={false}
      >
        <IconBook aria-hidden />
      </Button>
    </div>
  )
}
