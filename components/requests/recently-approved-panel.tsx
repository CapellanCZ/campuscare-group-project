"use client"

import { useEffect, useMemo, useState } from "react"
import {
  IconCalendarEvent,
  IconCheck,
  IconEye,
  IconHash,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  consultationRequestStatusLabel,
  formatRequestPreferred,
} from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import { manilaDayBounds, relativeTimeFrom } from "@/lib/health/time"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  appointmentRequestStatusDot,
  appointmentRequestStatusTone,
} from "@/lib/ui/status-badge-tone"
import {
  RECENTLY_APPROVED_LIMIT,
  RECENTLY_APPROVED_PAGE_SIZE,
} from "@/features/requests/lib/recently-approved"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

export { RECENTLY_APPROVED_LIMIT, RECENTLY_APPROVED_PAGE_SIZE }

const RECENT_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const

type RecentSort = (typeof RECENT_SORTS)[number]["value"]

export function sortRecentlyApproved(
  items: AppointmentRequest[],
  direction: RecentSort = "newest"
): AppointmentRequest[] {
  const factor = direction === "newest" ? -1 : 1
  return [...items].sort(
    (a, b) =>
      factor *
      (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
  )
}

function countApprovedToday(items: AppointmentRequest[]) {
  const { startIso, endIso } = manilaDayBounds()
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endIso).getTime()
  return items.filter((item) => {
    const ms = new Date(item.updatedAt).getTime()
    return ms >= startMs && ms <= endMs
  }).length
}

export function RecentlyApprovedPanel({
  items,
  loading = false,
  canViewDetails,
  onView,
  className,
}: {
  items: AppointmentRequest[]
  loading?: boolean
  canViewDetails: boolean
  onView: (request: AppointmentRequest) => void
  className?: string
}) {
  const [sort, setSort] = useState<RecentSort>("newest")
  const [page, setPage] = useState(1)
  const sortItems = selectItemsRecord(
    RECENT_SORTS.map((option) => ({
      value: option.value,
      label: option.label,
    }))
  )
  const sortedItems = useMemo(
    () => sortRecentlyApproved(items, sort),
    [items, sort]
  )
  const todayCount = useMemo(() => countApprovedToday(items), [items])
  const totalPages = Math.max(
    1,
    Math.ceil(sortedItems.length / RECENTLY_APPROVED_PAGE_SIZE)
  )
  const safePage = Math.min(page, totalPages)
  const pageItems = sortedItems.slice(
    (safePage - 1) * RECENTLY_APPROVED_PAGE_SIZE,
    safePage * RECENTLY_APPROVED_PAGE_SIZE
  )

  useEffect(() => {
    setPage(1)
  }, [sort, items])

  return (
    <Card className={cn(panelCardClassName, "h-full gap-0 py-0", className)}>
      <CardHeader className="gap-3 border-b px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base">Recently approved</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {todayCount} today
              {sort === "newest" ? " · newest first" : " · oldest first"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground"
            >
              {Math.min(sortedItems.length, RECENTLY_APPROVED_PAGE_SIZE)} / page
            </Badge>
            <Select
              value={sort}
              items={sortItems}
              onValueChange={(value) =>
                setSort((value as RecentSort) ?? "newest")
              }
            >
              <SelectTrigger
                className="h-8 w-[9.5rem]"
                aria-label="Sort recently approved"
              >
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {RECENT_SORTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        {loading && items.length === 0 ? (
          <div
            className="space-y-2 p-4"
            role="status"
            aria-label="Loading recently approved"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconCheck aria-hidden />
              </EmptyMedia>
              <EmptyTitle>No approved requests yet</EmptyTitle>
              <EmptyDescription>
                Approved bookings appear here in real time.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y divide-border" aria-label="Recently approved">
            {pageItems.map((request) => {
              const preferred = formatRequestPreferred(
                request.preferredDate,
                request.preferredTime
              )
              const serviceLabel = displayConsultationLabel(
                request.service,
                request.reason
              )
              const specialtyLabel = consultationProviderLabel(
                request.providerType
              )
              return (
                <li
                  key={request.id}
                  className="flex items-start gap-2 px-4 py-3 hover:bg-muted/30 sm:px-5"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {request.patientName}
                      </p>
                      <StatusBadge
                        className="shrink-0"
                        label={consultationRequestStatusLabel(request.status)}
                        toneClassName={appointmentRequestStatusTone(
                          request.status
                        )}
                        dotClassName={appointmentRequestStatusDot(
                          request.status
                        )}
                      />
                      {request.queueNumber != null ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                          <IconHash className="size-3" aria-hidden />
                          {request.queueNumber}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        specialtyLabel,
                        serviceLabel !== "—" ? serviceLabel : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {preferred !== "—" ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <IconCalendarEvent
                            className="size-3 shrink-0 opacity-70"
                            aria-hidden
                          />
                          <span className="truncate">{preferred}</span>
                        </span>
                      ) : null}
                      <span className="tabular-nums">
                        {relativeTimeFrom(request.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {canViewDetails ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="size-7 shrink-0 border-border/70 bg-background text-muted-foreground"
                      aria-label={`View ${request.patientName}`}
                      title="View details"
                      onClick={() => onView(request)}
                    >
                      <IconEye aria-hidden />
                    </Button>
                  ) : (
                    <span className="size-7 shrink-0" aria-hidden />
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {sortedItems.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-5">
            <p
              className="text-xs text-muted-foreground tabular-nums"
              role="status"
            >
              Showing {pageItems.length} most recent
              {sortedItems.length > RECENTLY_APPROVED_PAGE_SIZE ? (
                <span className="text-muted-foreground/80">
                  {" "}
                  · Page {safePage} of {totalPages}
                </span>
              ) : null}
            </p>
            {sortedItems.length > RECENTLY_APPROVED_PAGE_SIZE ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
