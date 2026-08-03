"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
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
import {
  fetchNotificationsAction,
  fetchPreferencesAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/settings/actions"
import type { StaffNotification } from "@/services/notifications"
import { cn } from "@/lib/utils"

function relativeTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  })
}

function initialsFor(type: StaffNotification["type"]) {
  if (type === "consultation_request") return "CR"
  if (type === "queue") return "Q"
  return "A"
}

export function HeaderNotifications() {
  return <HeaderNotificationsInbox />
}

function HeaderNotificationsInbox() {
  const router = useRouter()
  const [items, setItems] = useState<StaffNotification[]>([])
  const [pending, startTransition] = useTransition()

  const load = useCallback(() => {
    startTransition(async () => {
      const [notificationsResult, preferencesResult] = await Promise.all([
        fetchNotificationsAction(),
        fetchPreferencesAction(),
      ])
      if (!notificationsResult.ok) return
      const preferences = preferencesResult.ok ? preferencesResult.data : null
      setItems(
        notificationsResult.data.filter((notification) => {
          if (notification.type === "consultation_request") {
            return preferences?.notifyConsultationRequests ?? true
          }
          if (notification.type === "queue") return preferences?.notifyQueue ?? true
          return preferences?.notifyAnnouncements ?? true
        })
      )
    })
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [load])

  const unreadCount = items.filter((item) => item.unread).length

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction()
      if (!result.ok) return
      setItems((current) =>
        current.map((item) =>
          item.unread ? { ...item, unread: false } : item
        )
      )
    })
  }

  function openItem(notification: StaffNotification) {
    startTransition(async () => {
      if (notification.unread) {
        await markNotificationReadAction(notification.id)
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, unread: false } : item
          )
        )
      }
      if (notification.href) router.push(notification.href)
    })
  }

  return (
    <DropdownMenu>
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
                className="text-xs font-normal text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                disabled={pending}
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
                      {initialsFor(notification.type)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <p className="leading-snug">
                      <span className="font-medium">{notification.title}</span>
                    </p>
                    <p className="truncate text-muted-foreground">
                      {notification.body}
                    </p>
                    <span className="text-muted-foreground">
                      {relativeTime(notification.createdAt)}
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
