"use client"

import type { ComponentType, ReactNode } from "react"
import { IconHash } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

function MetaChip({
  icon: Icon,
  label,
}: {
  icon?: ComponentType<{ className?: string; stroke?: number }>
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
      {Icon ? (
        <Icon className="size-3.5 shrink-0 opacity-70" stroke={1.75} aria-hidden />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  )
}

export function QueueTicketListItem({
  index,
  ticketCode,
  patientName,
  status,
  chips,
  actions,
  className,
}: {
  index: number
  ticketCode: string
  patientName: string
  status?: ReactNode
  chips: Array<{
    key: string
    label: string
    icon?: ComponentType<{ className?: string; stroke?: number }>
  }>
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-6 py-4",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="w-5 shrink-0 pt-0.5 text-right text-sm tabular-nums text-muted-foreground"
          aria-hidden
        >
          {index}.
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate font-medium text-foreground">
              {patientName}
            </p>
            {status}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaChip icon={IconHash} label={ticketCode} />
            {chips.map((chip) => (
              <MetaChip key={chip.key} icon={chip.icon} label={chip.label} />
            ))}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 pl-8 sm:pl-0">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
