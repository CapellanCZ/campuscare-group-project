"use client"

import Link from "next/link"
import { IconBell, IconMoon, IconSearch, IconSun, IconLogout2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { NavUser } from "@/components/nav-user"
import { useTheme } from "@/components/theme-provider"

export function RoleHeader() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      <div className="relative w-full max-w-md">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search modules, patients, or records..." className="pl-9" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Notifications">
          <IconBell />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <NavUser />
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/auth/logout" />}
          nativeButton={false}
        >
          <IconLogout2 data-icon="inline-start" />
          Logout
        </Button>
      </div>
    </header>
  )
}
