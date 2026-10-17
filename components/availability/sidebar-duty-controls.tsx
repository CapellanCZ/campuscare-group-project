"use client"

import {
  IconCircleFilled,
  IconCoffee,
  IconLogout,
  IconPlayerPlay,
} from "@tabler/icons-react"

import { useOptionalBreakMode } from "@/components/availability/break-mode-context"
import { useOptionalDutyStatus } from "@/components/availability/duty-status-control"
import { emitDutyRefresh } from "@/components/staff-realtime-shell"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { Button } from "@/components/ui/button"
import {
  endDutyAction,
  startDutyAction,
} from "@/features/availability/actions/availability"
import { dutyStatusLabel } from "@/lib/availability/types"
import { dutyToasts } from "@/lib/feedback/toast-messages"
import { cn } from "@/lib/utils"

/**
 * Duty + break controls for the sidebar footer — sits above Bin / utility links.
 * Collapsed (icon) mode shows status + icon-only actions.
 */
export function SidebarDutyControls({ className }: { className?: string }) {
  const ctx = useOptionalDutyStatus()
  const breakMode = useOptionalBreakMode()
  const { confirmPreset } = useConfirm()

  if (!ctx) return null

  const { dutyStatus, pending, refresh, applyOptimistic } = ctx
  const onBreak =
    dutyStatus.status === "on_break" || Boolean(breakMode?.active)
  const available = dutyStatus.status === "available" && !onBreak
  const notAvailable = dutyStatus.status === "not_available" && !onBreak
  const canBreak =
    available && Boolean(breakMode?.mode) && !breakMode?.active

  const handleStartDuty = () => {
    void confirmPreset("startDuty", {
      onConfirm: async () => {
        const snapshot = dutyStatus
        const now = new Date().toISOString()
        applyOptimistic({
          status: "available",
          dutyStartedAt: now,
          dutyEndedAt: null,
          updatedAt: now,
        })
        emitDutyRefresh()
        const result = await startDutyAction()
        if (!result.ok) {
          applyOptimistic(snapshot)
          dutyToasts.failed(result.error)
          refresh()
          emitDutyRefresh()
          throw new Error(result.error)
        }
        dutyToasts.started()
        refresh()
        emitDutyRefresh()
      },
    })
  }

  const handleEndDuty = () => {
    void confirmPreset("endDuty", {
      onConfirm: async () => {
        const snapshot = dutyStatus
        const now = new Date().toISOString()
        applyOptimistic({
          status: "not_available",
          dutyStartedAt: snapshot.dutyStartedAt,
          dutyEndedAt: now,
          updatedAt: now,
        })
        emitDutyRefresh()
        const result = await endDutyAction()
        if (!result.ok) {
          applyOptimistic(snapshot)
          dutyToasts.failed(result.error)
          refresh()
          emitDutyRefresh()
          throw new Error(result.error)
        }
        dutyToasts.ended()
        refresh()
        emitDutyRefresh()
      },
    })
  }

  const handleStartBreak = () => {
    if (!breakMode) return
    void confirmPreset("goOnBreak", {
      onConfirm: async () => {
        breakMode.startBreak()
      },
    })
  }

  const statusTone = onBreak
    ? "text-amber-600 dark:text-amber-400"
    : available
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground"

  return (
    <div
      className={cn(
        "border-t px-2 py-2.5",
        "group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-2",
        className
      )}
    >
      <div
        className={cn(
          "rounded-lg border border-border/80 bg-muted/40 p-2",
          "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-1 pb-2",
            "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-0"
          )}
          title={dutyStatusLabel(
            onBreak ? "on_break" : dutyStatus.status
          )}
        >
          <IconCircleFilled
            className={cn("size-2.5 shrink-0", statusTone)}
            aria-hidden
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Duty
            </p>
            <p className={cn("truncate text-sm font-medium", statusTone)}>
              {dutyStatusLabel(onBreak ? "on_break" : dutyStatus.status)}
            </p>
          </div>
        </div>

        {onBreak ? null : (
          <div
            className={cn(
              "flex gap-1.5",
              "group-data-[collapsible=icon]:flex-col"
            )}
          >
            {notAvailable ? (
              <Button
                type="button"
                size="sm"
                className="h-8 flex-1 gap-1.5 rounded-md px-2 text-xs group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:p-0"
                disabled={pending}
                onClick={handleStartDuty}
                aria-label="Start Duty"
                title="Start Duty"
              >
                <IconPlayerPlay className="size-3.5 shrink-0" aria-hidden />
                <span className="group-data-[collapsible=icon]:hidden">
                  Start Duty
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1.5 rounded-md border-border/80 bg-background px-2 text-xs shadow-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:p-0"
                disabled={pending}
                onClick={handleEndDuty}
                aria-label="End Duty"
                title="End Duty"
              >
                <IconLogout className="size-3.5 shrink-0" aria-hidden />
                <span className="group-data-[collapsible=icon]:hidden">
                  End Duty
                </span>
              </Button>
            )}

            {canBreak ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1.5 rounded-md border-border/80 bg-background px-2 text-xs shadow-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:p-0"
                disabled={pending || Boolean(breakMode?.pending)}
                onClick={handleStartBreak}
                aria-label="Start break"
                title="Break"
              >
                <IconCoffee className="size-3.5 shrink-0" aria-hidden />
                <span className="group-data-[collapsible=icon]:hidden">
                  Break
                </span>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
