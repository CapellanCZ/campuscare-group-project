"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconBell } from "@tabler/icons-react"
import { motion } from "motion/react"

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
import {
  loadHeaderInboxAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/settings/actions"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { appToast } from "@/lib/feedback/app-toast"
import {
  buildFallbackNotifications,
  filterNotificationsByPrefs,
  type HeaderStaffNotification,
} from "@/lib/notifications/header-notifications"
import {
  getSessionNotifications,
  saveSessionNotifications,
} from "@/lib/notifications/session-notifications-cache"
import {
  clearSessionNotifyPrefs,
  getSessionNotifyPrefs,
  getSessionNotifyPrefsOrDefault,
  saveSessionNotifyPrefs,
} from "@/lib/notifications/session-prefs-cache"
import { cn } from "@/lib/utils"

const CLEAR_DOT_MS = 280
const CLEAR_STAGGER_MS = 55
const CLEAR_EASE = [0.23, 1, 0.32, 1] as const

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

function initialsFor(type: HeaderStaffNotification["type"]) {
  if (type === "consultation_request") return "CR"
  if (type === "queue") return "Q"
  return "A"
}

function isFallbackId(id: string) {
  return id.startsWith("fallback-")
}

export function HeaderNotifications() {
  return <HeaderNotificationsInbox />
}

function HeaderNotificationsInbox() {
  const router = useRouter()
  const access = useOptionalStaffAccess()
  const designation = access?.primaryRole ?? "physician"
  const userId = access?.userId
  const [items, setItems] = useState<HeaderStaffNotification[]>(
    () => getSessionNotifications() ?? []
  )
  const [usingFallback, setUsingFallback] = useState(false)
  const [pending, startTransition] = useTransition()
  const [clearing, setClearing] = useState(false)
  const [clearingIds, setClearingIds] = useState<Set<string>>(() => new Set())
  const clearingRef = useRef(false)
  const clearTimerRef = useRef<number | null>(null)
  const knownIdsRef = useRef<Set<string> | null>(null)

  const applyInbox = useCallback((next: HeaderStaffNotification[]) => {
    // Keep the cleanup animation stable if realtime refreshes mid-clear.
    const incoming = clearingRef.current
      ? next.map((item) => (item.unread ? { ...item, unread: false } : item))
      : next

    const known = knownIdsRef.current
    if (known && !clearingRef.current) {
      const fresh = incoming.filter(
        (item) => item.unread && !known.has(item.id) && !isFallbackId(item.id)
      )
      for (const item of fresh.slice(0, 3)) {
        appToast.notify(
          {
            title: item.title,
            description: item.body,
          },
          "info",
          `notify-${item.id}`
        )
      }
    }
    knownIdsRef.current = new Set(incoming.map((item) => item.id))
    saveSessionNotifications(incoming)
    setItems(incoming)
  }, [])

  const load = useCallback(
    (options?: { refreshPrefs?: boolean }) => {
      startTransition(async () => {
        const needPrefs =
          Boolean(options?.refreshPrefs) || getSessionNotifyPrefs() == null

        try {
          const result = await loadHeaderInboxAction({
            includePrefs: needPrefs,
          })

          if (result.ok && result.data.preferences) {
            saveSessionNotifyPrefs({
              notifyConsultationRequests:
                result.data.preferences.notifyConsultationRequests,
              notifyQueue: result.data.preferences.notifyQueue,
              notifyAnnouncements: result.data.preferences.notifyAnnouncements,
            })
          }

          const preferences = getSessionNotifyPrefsOrDefault()

          if (result.ok) {
            // Supabase is source of truth — empty inbox stays empty.
            setUsingFallback(false)
            applyInbox(
              filterNotificationsByPrefs(result.data.notifications, preferences)
            )
            return
          }

          setUsingFallback(true)
          applyInbox(
            filterNotificationsByPrefs(
              buildFallbackNotifications(designation),
              preferences
            )
          )
        } catch {
          const preferences = getSessionNotifyPrefsOrDefault()
          setUsingFallback(true)
          applyInbox(
            filterNotificationsByPrefs(
              buildFallbackNotifications(designation),
              preferences
            )
          )
        }
      })
    },
    [applyInbox, designation]
  )

  useStaffRealtimeRefresh(
    userId ? `staff-notifications-${userId}` : "staff-notifications",
    STAFF_REALTIME_TABLES.notifications,
    () => load(),
    300,
    userId ? { notifications: `user_id=eq.${userId}` } : undefined
  )

  useEffect(() => {
    load()
    const id = window.setInterval(() => load(), 300_000)
    const onPrefs = () => {
      clearSessionNotifyPrefs()
      load({ refreshPrefs: true })
    }
    window.addEventListener("campuscare:notification-prefs", onPrefs)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("campuscare:notification-prefs", onPrefs)
      if (clearTimerRef.current != null) {
        window.clearTimeout(clearTimerRef.current)
      }
    }
  }, [load])

  const unreadCount = items.filter((item) => item.unread).length
  const badgeCount = clearing ? 0 : unreadCount

  function finishClearAnimation(snapshot: HeaderStaffNotification[]) {
    const unreadIds = snapshot.filter((item) => item.unread).map((item) => item.id)
    const totalMs =
      CLEAR_DOT_MS + Math.max(0, unreadIds.length - 1) * CLEAR_STAGGER_MS + 60

    clearTimerRef.current = window.setTimeout(() => {
      setItems((current) => {
        const next = current.map((item) =>
          item.unread ? { ...item, unread: false } : item
        )
        saveSessionNotifications(next)
        return next
      })
      clearingRef.current = false
      setClearingIds(new Set())
      setClearing(false)
      clearTimerRef.current = null
    }, totalMs)
  }

  function markAllRead() {
    if (unreadCount === 0 || pending || clearing) return

    const snapshot = items
    const unreadIds = snapshot
      .filter((item) => item.unread)
      .map((item) => item.id)
    if (unreadIds.length === 0) return

    clearingRef.current = true
    setClearing(true)
    setClearingIds(new Set(unreadIds))

    // Persist while the staggered cleanup plays.
    startTransition(async () => {
      if (!usingFallback) {
        const result = await markAllNotificationsReadAction()
        if (!result.ok) {
          if (clearTimerRef.current != null) {
            window.clearTimeout(clearTimerRef.current)
            clearTimerRef.current = null
          }
          clearingRef.current = false
          setClearingIds(new Set())
          setClearing(false)
          setItems(snapshot)
          saveSessionNotifications(snapshot)
          appToast.notify(
            {
              title: "Couldn't mark all as read",
              description: result.error,
            },
            "error"
          )
          return
        }
      }
    })

    finishClearAnimation(snapshot)
  }

  function openItem(notification: HeaderStaffNotification) {
    startTransition(async () => {
      if (notification.unread) {
        setItems((current) => {
          const next = current.map((item) =>
            item.id === notification.id ? { ...item, unread: false } : item
          )
          saveSessionNotifications(next)
          return next
        })

        if (!isFallbackId(notification.id) && !usingFallback) {
          const result = await markNotificationReadAction(notification.id)
          if (!result.ok) {
            load()
            appToast.notify(
              {
                title: "Couldn't mark as read",
                description: result.error,
              },
              "error"
            )
          }
        }
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
        <span
          className={cn(
            "absolute -top-1.5 -right-1.5 transition-[opacity,transform] duration-300 ease-out",
            badgeCount > 0
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-75 opacity-0"
          )}
        >
          {badgeCount > 0 ? (
            <Badge
              variant="destructive"
              size="xs"
              className="min-w-4 justify-center rounded-full px-1"
              aria-hidden="true"
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </Badge>
          ) : null}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(100vw-1.5rem,22rem)] overflow-hidden p-0 sm:w-96"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-3 px-3.5 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && !clearing ? (
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-primary underline-offset-2 transition-opacity hover:underline disabled:opacity-50"
                disabled={pending || clearing}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  markAllRead()
                }}
              >
                Mark all as read
              </button>
            ) : (
              <motion.span
                key={clearing ? "clearing" : "caught-up"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: CLEAR_EASE }}
                className="text-xs font-normal text-muted-foreground"
              >
                {clearing ? "Clearing…" : "All caught up"}
              </motion.span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-0" />
          {items.length === 0 ? (
            <div
              className="px-4 py-10 text-center text-sm text-muted-foreground"
              role="status"
            >
              No notifications yet. Turn notification types on in Profile and
              Settings.
            </div>
          ) : (
            <DropdownMenuGroup className="max-h-[min(50dvh,22rem)] overflow-y-auto overscroll-contain p-1.5">
              {items.map((notification) => {
                const isClearing = clearingIds.has(notification.id)
                const showUnreadChrome = notification.unread && !isClearing
                const clearOrder = isClearing
                  ? [...clearingIds].indexOf(notification.id)
                  : -1
                const clearDelay =
                  clearOrder >= 0 ? clearOrder * (CLEAR_STAGGER_MS / 1000) : 0

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors duration-300 ease-out",
                      showUnreadChrome ? "bg-muted/40" : "bg-transparent"
                    )}
                    style={
                      isClearing
                        ? {
                            transitionDelay: `${clearOrder * CLEAR_STAGGER_MS}ms`,
                          }
                        : undefined
                    }
                    onClick={() => openItem(notification)}
                  >
                    <motion.div
                      animate={
                        isClearing
                          ? { opacity: 0.75 }
                          : { opacity: 1 }
                      }
                      transition={{
                        duration: CLEAR_DOT_MS / 1000,
                        delay: clearDelay,
                        ease: CLEAR_EASE,
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      <Avatar className="mt-0.5 size-8 shrink-0">
                        <AvatarFallback className="text-[10px] font-medium">
                          {initialsFor(notification.type)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-snug font-medium text-foreground">
                            {notification.title}
                          </p>
                          <motion.span
                            aria-hidden="true"
                            initial={false}
                            animate={
                              showUnreadChrome
                                ? { scale: 1, opacity: 1 }
                                : { scale: 0, opacity: 0 }
                            }
                            transition={{
                              duration: CLEAR_DOT_MS / 1000,
                              delay: isClearing ? clearDelay : 0,
                              ease: CLEAR_EASE,
                            }}
                            className="mt-1.5 size-2 shrink-0 origin-center rounded-full bg-primary"
                          />
                        </div>
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {notification.body}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80">
                          {relativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
