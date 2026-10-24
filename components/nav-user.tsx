"use client"

import Link from "next/link"
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
import { useOptionalDutyStatus } from "@/components/availability/duty-status-control"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { staffBasePath } from "@/lib/auth/home-path"
import { allowNextUnload } from "@/lib/auth/session-unload"
import { patchSessionDutyStatus } from "@/lib/availability/session-duty-cache"
import { dutyToasts } from "@/lib/feedback/toast-messages"
import { useStaffThemeToggle } from "@/hooks/use-staff-theme-toggle"
import { resetActiveThemeStorage } from "@/lib/theme/staff-theme-storage"
import {
  IconLogout,
  IconMoon,
  IconSun,
  IconUser,
} from "@tabler/icons-react"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

export function NavUser() {
  const access = useOptionalStaffAccess()
  const duty = useOptionalDutyStatus()
  const { isDark, pending, toggleTheme } = useStaffThemeToggle()
  const { confirmPreset } = useConfirm()

  const name = access?.fullName ?? "Staff"
  const email = access?.email ?? ""
  const avatarUrl = access?.avatarUrl ?? null
  const base = access ? staffBasePath(access.primaryRole) : "/login"
  const settingsHref = `${base}/settings`
  const mark = initials(name)
  const dutyActive =
    duty != null && duty.dutyStatus.status !== "not_available"

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
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (dutyActive) {
                dutyToasts.logoutBlocked()
                return
              }
              void confirmPreset("logout", {
                onConfirm: async () => {
                  allowNextUnload()
                  resetActiveThemeStorage("light")
                  // Avoid a stale Available flash if this tab remounts before redirect.
                  patchSessionDutyStatus({
                    status: "not_available",
                    dutyStartedAt: null,
                    dutyEndedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                  // Clear duty while the session is still valid, then sign out.
                  window.location.replace("/auth/logout")
                },
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
