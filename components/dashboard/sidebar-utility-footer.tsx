"use client"

import Link from "next/link"
import { IconBook, IconMoon, IconSun } from "@tabler/icons-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useStaffThemeToggle } from "@/hooks/use-staff-theme-toggle"
import { cn } from "@/lib/utils"

type SidebarUtilityFooterProps = {
  docsHref?: string
  className?: string
}

/**
 * Theme + docs controls — sit at the top of the sidebar footer,
 * above Bin / copyright.
 */
export function SidebarUtilityFooter({
  docsHref = "/docs",
  className,
}: SidebarUtilityFooterProps) {
  const { isDark, pending, toggleTheme } = useStaffThemeToggle()
  const nextTheme = isDark ? "light" : "dark"

  return (
    <SidebarMenu className={cn("gap-0.5", className)}>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          size="sm"
          className="text-muted-foreground"
          disabled={pending}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
          onClick={toggleTheme}
        >
          {isDark ? (
            <IconSun className="size-4" aria-hidden />
          ) : (
            <IconMoon className="size-4" aria-hidden />
          )}
          <span className="font-medium">
            {isDark ? "Light mode" : "Dark mode"}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="sm"
          className="text-muted-foreground"
          tooltip="Documentation"
          render={<Link href={docsHref} />}
        >
          <IconBook className="size-4" aria-hidden />
          <span className="font-medium">Docs</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
