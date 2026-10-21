"use client"

import {
  IconCalendarEvent,
  IconCheck,
  IconEye,
  IconHash,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  consultationRequestStatusLabel,
  formatRequestPreferred,
} from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import { relativeTimeFrom } from "@/lib/health/time"
import { panelCardClassName } from "@/components/layout/panel-frame"
import {
  appointmentRequestStatusDot,
  appointmentRequestStatusTone,
} from "@/lib/ui/status-badge-tone"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

export const RECENTLY_APPROVED_LIMIT = 8

export function sortRecentlyApproved(
  items: AppointmentRequest[]
): AppointmentRequest[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
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
  return (
    <Card className={cn(panelCardClassName, "gap-0 py-0", className)}>
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle className="text-base">Recently Approved</CardTitle>
        <CardDescription>
          Confirmed bookings, newest first.
        </CardDescription>
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
        ) : items.length === 0 ? (
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
            {items.map((request) => {
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
                  className="flex items-start gap-2 px-4 py-3.5"
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
                      {[specialtyLabel, serviceLabel !== "—" ? serviceLabel : null]
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
        {items.length > 0 ? (
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            Showing {items.length} most recent
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
