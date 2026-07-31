"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconBell } from "@tabler/icons-react"

import { Badge } from "@/components/reui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  buildHeaderNotifications,
  type HeaderNotification,
} from "@/lib/notifications/header-notifications"
import { cn } from "@/lib/utils"

export function HeaderNotifications() {
  const access = useOptionalStaffAccess()
  const designation = access?.primaryRole ?? "admin"

  return (
    <HeaderNotificationsInbox key={designation} designation={designation} />
  )
}

function HeaderNotificationsInbox({
  designation,
}: {
  designation: ClinicDesignation
}) {
  const router = useRouter()
  const [items, setItems] = useState<HeaderNotification[]>(() =>
    buildHeaderNotifications(designation)
  )

  const unreadCount = items.filter((item) => item.unread).length

  function markAllRead() {
    setItems((current) =>
      current.map((item) => (item.unread ? { ...item, unread: false } : item))
    )
  }

  function openItem(notification: HeaderNotification) {
    setItems((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, unread: false } : item
      )
    )
    router.push(notification.href)
  }

  return (
    <DropdownMenu>
      {/* c-dropdown-menu-11: children on Trigger, empty Button in `render` */}
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            size="icon-sm"
            variant="outline"
            className="relative shrink-0"
          />
        }
      >
        <IconBell aria-hidden="true" />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            size="xs"
            className="absolute -top-1.5 -right-1.5 min-w-4 justify-center rounded-full px-1"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span>Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-normal text-foreground underline-offset-2 hover:underline"
                onClick={(event) => {
                  event.preventDefault()
                  markAllRead()
                }}
              >
                Mark all as read
              </button>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">
                All caught up
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 ? (
            <div
              className="px-2 py-8 text-center text-sm text-muted-foreground"
              role="status"
            >
              No notifications yet.
            </div>
          ) : (
            <DropdownMenuGroup>
              {items.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex items-start gap-2 py-2"
                  onClick={() => openItem(notification)}
                >
                  <Avatar className="mt-0.5 size-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {notification.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <p className="leading-snug">
                      <span className="font-medium">{notification.title}</span>
                    </p>
                    <p className="truncate text-muted-foreground">
                      {notification.detail}
                    </p>
                    <span className="text-muted-foreground">
                      {notification.time}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "mt-2 size-1.5 shrink-0 rounded-full",
                      notification.unread ? "bg-primary" : "bg-transparent"
                    )}
                    aria-hidden="true"
                  />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
