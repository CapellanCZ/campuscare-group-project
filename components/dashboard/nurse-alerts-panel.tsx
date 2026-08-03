"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  IconAlertTriangle,
  IconBellRinging,
  IconClipboardList,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { panelCardClassName } from "@/components/layout/panel-frame"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"

const LONG_WAIT_MINUTES = 30

type AlertItem = {
  id: string
  title: string
  detail: string
  href: string
  unread: boolean
}

function buildNurseAlerts(
  summary: RoleDashboardSummary,
  tickets: QueueTicketRow[]
): AlertItem[] {
  const items: AlertItem[] = []

  if (summary.requests.pendingCount > 0) {
    items.push({
      id: "pending-requests",
      title: "Pending consultation requests",
      detail: `${summary.requests.pendingCount} awaiting triage`,
      href: "/nurse/consultation-requests",
      unread: true,
    })
  }

  const longWait = tickets.filter(
    (row) =>
      (row.status === "waiting" || row.status === "called") &&
      (row.estimatedWaitMinutes ?? 0) >= LONG_WAIT_MINUTES
  ).length
  if (longWait > 0) {
    items.push({
      id: "long-wait",
      title: "Long wait times",
      detail: `${longWait} patient${longWait === 1 ? "" : "s"} past ${LONG_WAIT_MINUTES}m`,
      href: "/nurse/queue-management",
      unread: true,
    })
  }

  const latest = summary.announcements.recent.find(
    (item) => item.status === "published"
  )
  if (latest) {
    items.push({
      id: `ann-${latest.id}`,
      title: latest.title,
      detail: latest.excerpt || "Latest published announcement",
      href: "/nurse/announcements",
      unread: false,
    })
  }

  return items.slice(0, 3)
}

export function NurseAlertsPanel({
  summary,
  tickets,
  className,
}: {
  summary: RoleDashboardSummary
  tickets: QueueTicketRow[]
  className?: string
}) {
  const derived = useMemo(
    () => buildNurseAlerts(summary, tickets),
    [summary, tickets]
  )
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())

  const items = derived.map((item) =>
    readIds.has(item.id) ? { ...item, unread: false } : item
  )
  const unreadCount = items.filter((item) => item.unread).length

  return (
    <Card className={cn(panelCardClassName, "h-full", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Alerts</CardTitle>
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {unreadCount}
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            Queue signals · full inbox is in the header bell.
          </CardDescription>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={() =>
              setReadIds(new Set(items.map((item) => item.id)))
            }
          >
            Mark read
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0 space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            No alerts right now.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon =
                item.id.includes("wait") || item.id.includes("queue")
                  ? IconAlertTriangle
                  : item.id.includes("ann")
                    ? IconBellRinging
                    : IconClipboardList
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      item.unread && "bg-muted/40"
                    )}
                    onClick={() =>
                      setReadIds((current) => new Set(current).add(item.id))
                    }
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    {item.unread ? (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
