"use client"

import Link from "next/link"
import { useTransition } from "react"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
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
import { designationLabel } from "@/lib/health/roles"
import { IconLogout2, IconUser } from "@tabler/icons-react"

export function NavUser() {
  const access = useOptionalStaffAccess()
  const [pending, startTransition] = useTransition()

  const name = access?.fullName ?? "Staff"
  const email = access?.email ?? ""
  const role = access ? designationLabel(access.primaryRole) : "Clinic"
  const home = access ? staffBasePath(access.primaryRole) : "/login"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Open profile menu"
      >
        <Avatar className="size-8">
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className="flex items-center justify-start gap-2">
          <DropdownMenuLabel className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="font-medium text-foreground">{name}</span>
              <div className="truncate text-muted-foreground text-xs">{email}</div>
              <div className="text-muted-foreground text-xs">{role}</div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={home} />}>
            <IconUser />
            Dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await signOut()
                window.location.assign("/login")
              })
            }}
          >
            <IconLogout2 />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
