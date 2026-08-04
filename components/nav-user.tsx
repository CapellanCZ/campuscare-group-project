"use client"

import Link from "next/link"
import { useTransition } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { signOut } from "@/app/auth/actions"
import { savePreferencesAction } from "@/features/settings/actions"
import { staffBasePath } from "@/lib/auth/home-path"
import {
  IconCalendar,
  IconLogout,
  IconMoon,
  IconSun,
  IconUser,
} from "@tabler/icons-react"
import { toast } from "sonner"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

export function NavUser() {
  const access = useOptionalStaffAccess()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [pending, startTransition] = useTransition()

  const name = access?.fullName ?? "Staff"
  const email = access?.email ?? ""
  const avatarUrl = access?.avatarUrl ?? null
  const base = access ? staffBasePath(access.primaryRole) : "/login"
  const settingsHref = `${base}/settings`
  const showSchedule =
    access?.primaryRole === "physician" || access?.primaryRole === "dentist"
  const mark = initials(name)
  const isDark = (resolvedTheme ?? theme) === "dark"

  function toggleTheme() {
    const next = isDark ? "light" : "dark"
    setTheme(next)
    if (!access) return
    startTransition(async () => {
      const result = await savePreferencesAction({ theme: next })
      if (!result.ok) {
        toast.error(result.error)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full p-0"
            aria-label="Open profile menu"
          />
        }
      >
        <Avatar className="size-8">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={name} />
          ) : null}
          <AvatarFallback className="bg-muted text-sm font-medium text-foreground">
            {mark}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 py-2">
            <Avatar className="size-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="bg-muted text-sm font-medium text-foreground">
                {mark}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {name}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {email || "Signed in"}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={settingsHref} />}>
              <IconUser aria-hidden="true" />
              Profile and Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                toggleTheme()
              }}
            >
              {isDark ? (
                <IconSun aria-hidden="true" />
              ) : (
                <IconMoon aria-hidden="true" />
              )}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            {showSchedule ? (
              <DropdownMenuItem render={<Link href={settingsHref} />}>
                <IconCalendar aria-hidden="true" />
                My schedule
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await signOut()
                window.location.assign("/login")
              })
            }}
          >
            <IconLogout aria-hidden="true" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
