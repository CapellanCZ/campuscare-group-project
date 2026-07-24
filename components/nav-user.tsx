"use client"

import Link from "next/link"
import {
  IconBell,
  IconBook,
  IconCommand,
  IconCreditCard,
  IconLifebuoy,
  IconLogout,
  IconUser,
} from "@tabler/icons-react"

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

type NavUserProps = {
  name?: string
  email?: string
  roleLabel?: string
  avatarUrl?: string | null
  profileHref?: string
  docsHref?: string
}

export function NavUser({
  name = "Clinic Staff",
  email = "staff@clinic.edu",
  roleLabel = "Staff",
  avatarUrl,
  profileHref = "/physician/profile",
  docsHref = "/docs",
}: NavUserProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="overflow-hidden rounded-full p-0"
            aria-label={`${name} account menu`}
          />
        }
      >
        <Avatar className="size-8">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials || "CC"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 py-2">
            <Avatar className="size-10">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials || "CC"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {name}
              </div>
              <div className="truncate text-xs font-normal text-muted-foreground">
                {email}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {roleLabel}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={profileHref} />}>
            <IconUser aria-hidden />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconBell aria-hidden />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCommand aria-hidden />
            Keyboard shortcuts
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <IconLifebuoy aria-hidden />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={docsHref} />}>
            <IconBook aria-hidden />
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCreditCard aria-hidden />
            Plan & billing
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            render={<Link href="/auth/logout" />}
          >
            <IconLogout aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
