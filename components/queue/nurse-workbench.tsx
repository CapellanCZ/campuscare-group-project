"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { SCHEDULED_TO_WAITING_MIME } from "@/components/queue/queue-status-tables"
import {
  DEFAULT_QUEUE_EARLY_ENTRY_MINUTES,
  QUEUE_EARLY_ENTRY_OPTIONS,
  type QueueEarlyEntryMinutes,
} from "@/lib/health/queue-early-entry-preference"
import { ticketLabel } from "@/lib/health/mappers"
import { listUpcomingScheduledNurseAppointments } from "@/lib/health/nurse-queue"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"
import {
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconHash,
  IconInbox,
  IconSettings,
} from "@tabler/icons-react"

const ENTER_EASE = [0.23, 1, 0.32, 1] as const
const WORKBENCH_PAGE_SIZE = 5

function nameInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatAppointmentTime(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function minutesUntilStart(iso: string | null, now: Date) {
  if (!iso) return null
  const start = new Date(iso)
  if (Number.isNaN(start.getTime())) return null
  return Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60_000))
}

function AppointmentRow({
  ticket,
  isNew,
  now,
  rowPending,
  onPlaceInWaiting,
}: {
  ticket: QueueTicketRow
  isNew: boolean
  now: Date
  rowPending?: boolean
  onPlaceInWaiting?: (ticket: QueueTicketRow) => void
}) {
  const appointmentTime = formatAppointmentTime(ticket.appointmentStartsAt)
  const mins = minutesUntilStart(ticket.appointmentStartsAt, now)

  return (
    <div
      draggable={Boolean(onPlaceInWaiting) && !rowPending}
      onDragStart={(event) => {
        if (!onPlaceInWaiting) return
        event.dataTransfer.setData(
          SCHEDULED_TO_WAITING_MIME,
          ticket.ticketId
        )
        event.dataTransfer.setData("text/plain", ticket.ticketId)
        event.dataTransfer.effectAllowed = "move"
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors duration-500 sm:px-6",
        isNew && "bg-primary/[0.04]",
        onPlaceInWaiting && !rowPending && "cursor-grab active:cursor-grabbing"
      )}
    >
      <Avatar className="size-9 shrink-0 rounded-lg after:rounded-lg">
        {ticket.patientAvatarUrl ? (
          <AvatarImage src={ticket.patientAvatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="rounded-lg text-xs font-medium">
          {nameInitials(ticket.patientName) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium text-foreground">
          {ticket.patientName}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
          {appointmentTime ? (
            <span className="inline-flex items-center gap-1">
              <IconCalendarEvent
                className="size-3"
                stroke={1.75}
                aria-hidden
              />
              {appointmentTime}
            </span>
          ) : null}
          {mins != null ? <span>Starts in {mins} min</span> : null}
          <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
            <IconHash className="size-3" stroke={1.75} aria-hidden />
            {ticketLabel(ticket.queueNumber, ticket.ticketCode)}
          </span>
        </div>
      </div>
      {onPlaceInWaiting ? (
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="shrink-0"
          disabled={rowPending}
          title="Place in Waiting"
          aria-label={`Place ${ticket.patientName} in Waiting`}
          onClick={(event) => {
            event.stopPropagation()
            onPlaceInWaiting(ticket)
          }}
        >
          <IconInbox className="size-3.5" stroke={1.75} aria-hidden />
          Place in Waiting
        </Button>
      ) : null}
    </div>
  )
}

function UpcomingBody({
  pageRows,
  freshIds,
  now,
  isTicketPending,
  earlyEntryMinutes,
  onPlaceInWaiting,
}: {
  pageRows: QueueTicketRow[]
  freshIds: Set<string>
  now: Date
  isTicketPending?: (ticketId: string) => boolean
  earlyEntryMinutes: QueueEarlyEntryMinutes
  onPlaceInWaiting?: (ticket: QueueTicketRow) => void
}) {
  if (pageRows.length === 0) {
    return (
      <Empty className="border-0 py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconCalendarEvent stroke={1.75} aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No upcoming appointments</EmptyTitle>
          <EmptyDescription>
            Scheduled patients stay here until {earlyEntryMinutes} minutes
            before their time, or until you place them in Waiting.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="divide-y overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        {pageRows.map((ticket, index) => (
          <motion.div
            key={ticket.ticketId}
            layout
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{
              duration: 0.32,
              delay: Math.min(index, 4) * 0.04,
              ease: ENTER_EASE,
            }}
          >
            <AppointmentRow
              ticket={ticket}
              isNew={freshIds.has(ticket.ticketId)}
              now={now}
              rowPending={isTicketPending?.(ticket.ticketId)}
              onPlaceInWaiting={onPlaceInWaiting}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function WorkbenchPagination({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
      <p className="text-xs tabular-nums text-muted-foreground" role="status">
        {pageCount > 1 ? (
          <>
            Page {page + 1} of {pageCount}
            <span className="mx-1.5 text-border">·</span>
          </>
        ) : null}
        {total} scheduled
      </p>
      {pageCount > 1 ? (
        <nav className="flex items-center gap-3" aria-label="Upcoming pages">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
              "hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            <IconChevronLeft className="size-3.5" stroke={1.75} aria-hidden />
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
              "hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            Next
            <IconChevronRight className="size-3.5" stroke={1.75} aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export function NurseWorkbench({
  tickets,
  isTicketPending,
  earlyEntryMinutes = DEFAULT_QUEUE_EARLY_ENTRY_MINUTES,
  onEarlyEntryMinutesChange,
  onPlaceInWaiting,
  className,
  variant = "embedded",
}: {
  tickets: QueueTicketRow[]
  isTicketPending?: (ticketId: string) => boolean
  earlyEntryMinutes?: QueueEarlyEntryMinutes
  onEarlyEntryMinutesChange?: (minutes: QueueEarlyEntryMinutes) => void
  onPlaceInWaiting?: (ticket: QueueTicketRow) => void
  /** @deprecated */
  onStartIntake?: (ticket: QueueTicketRow) => void
  className?: string
  variant?: "embedded" | "panel"
}) {
  const [now, setNow] = useState(() => new Date())
  const [upcoming, setUpcoming] = useState<QueueTicketRow[]>(() =>
    listUpcomingScheduledNurseAppointments(tickets, now, earlyEntryMinutes)
  )
  const [page, setPage] = useState(0)
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set())
  const knownIdsRef = useRef<Set<string> | null>(null)
  const ticketsRef = useRef(tickets)
  ticketsRef.current = tickets
  const earlyEntryRef = useRef(earlyEntryMinutes)
  earlyEntryRef.current = earlyEntryMinutes

  useEffect(() => {
    const next = listUpcomingScheduledNurseAppointments(
      tickets,
      new Date(),
      earlyEntryMinutes
    )
    const nextIds = new Set(next.map((row) => row.ticketId))
    const known = knownIdsRef.current

    if (known) {
      const added = next.filter((row) => !known.has(row.ticketId))
      if (added.length > 0) {
        const addedIds = new Set(added.map((row) => row.ticketId))
        setFreshIds(addedIds)
        setPage(0)
        window.setTimeout(() => {
          setFreshIds((current) => {
            const copy = new Set(current)
            for (const id of addedIds) copy.delete(id)
            return copy
          })
        }, 2400)
      }
    }

    knownIdsRef.current = nextIds
    setUpcoming(next)
  }, [tickets, earlyEntryMinutes])

  useEffect(() => {
    const id = window.setInterval(() => {
      const tick = new Date()
      setNow(tick)
      const next = listUpcomingScheduledNurseAppointments(
        ticketsRef.current,
        tick,
        earlyEntryRef.current
      )
      setUpcoming((prev) => {
        const prevKey = prev.map((row) => row.ticketId).join("|")
        const nextKey = next.map((row) => row.ticketId).join("|")
        if (prevKey === nextKey) return prev
        knownIdsRef.current = new Set(next.map((row) => row.ticketId))
        return next
      })
    }, 15_000)
    return () => window.clearInterval(id)
  }, [])

  const pageCount = Math.max(1, Math.ceil(upcoming.length / WORKBENCH_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = upcoming.slice(
    safePage * WORKBENCH_PAGE_SIZE,
    safePage * WORKBENCH_PAGE_SIZE + WORKBENCH_PAGE_SIZE
  )

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  const header = (
    <div className="min-w-0 space-y-0.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="min-w-0 text-base">
          Upcoming appointments
        </CardTitle>
        {onEarlyEntryMinutesChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Auto-move timing settings"
                />
              }
            >
              <IconSettings className="size-4" stroke={1.75} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Auto-move before start
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={String(earlyEntryMinutes)}
                onValueChange={(value) => {
                  const next = Number(value)
                  if (
                    QUEUE_EARLY_ENTRY_OPTIONS.includes(
                      next as QueueEarlyEntryMinutes
                    )
                  ) {
                    onEarlyEntryMinutesChange(next as QueueEarlyEntryMinutes)
                  }
                }}
              >
                {QUEUE_EARLY_ENTRY_OPTIONS.map((minutes) => (
                  <DropdownMenuRadioItem
                    key={minutes}
                    value={String(minutes)}
                  >
                    {minutes} min
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag onto Waiting, or Place in Waiting · auto{" "}
        {earlyEntryMinutes} min before start
      </p>
    </div>
  )

  const body = (
    <>
      <UpcomingBody
        pageRows={pageRows}
        freshIds={freshIds}
        now={now}
        isTicketPending={isTicketPending}
        earlyEntryMinutes={earlyEntryMinutes}
        onPlaceInWaiting={onPlaceInWaiting}
      />
      <WorkbenchPagination
        page={safePage}
        pageCount={pageCount}
        total={upcoming.length}
        onPageChange={setPage}
      />
    </>
  )

  if (variant === "panel") {
    return (
      <Card className={cn(panelCardClassName, "h-full gap-0 py-0", className)}>
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          {header}
        </CardHeader>
        <CardContent className="min-w-0 flex-1 p-0">{body}</CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("border-b bg-background", className)}>
      <div className="border-b px-6 py-5">{header}</div>
      {body}
    </div>
  )
}
