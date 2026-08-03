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
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { signOut } from "@/app/auth/actions"
import { staffBasePath } from "@/lib/auth/home-path"
import {
  IconCalendar,
  IconLogout,
  IconSettings,
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
  const [pending, startTransition] = useTransition()

  const name = access?.fullName ?? "Staff"
  const email = access?.email ?? ""
  const avatarUrl = access?.avatarUrl ?? null
  const base = access ? staffBasePath(access.primaryRole) : "/login"
  const settingsHref = `${base}/settings`
  const isPhysician = access?.primaryRole === "physician"
  const showSchedule =
    access?.primaryRole === "physician" || access?.primaryRole === "dentist"
  const mark = initials(name)

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
            {isPhysician ? (
              <DropdownMenuItem render={<Link href={settingsHref} />}>
                <IconUser aria-hidden="true" />
                Profile and Settings
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem render={<Link href={settingsHref} />}>
                  <IconUser aria-hidden="true" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={settingsHref} />}>
                  <IconSettings aria-hidden="true" />
                  Settings
                </DropdownMenuItem>
              </>
            )}
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
