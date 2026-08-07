import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StationBoard } from "@/lib/health/types"
import { formatResumeClock } from "@/lib/health/time"
import {
  IconDental,
  IconHeartbeat,
  IconStethoscope,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const stationTone: Record<
  StationBoard["station"],
  { accent: string; soft: string; icon: typeof IconHeartbeat }
> = {
  nurse: {
    accent: "text-rose-600 dark:text-rose-400",
    soft: "bg-rose-500/10",
    icon: IconHeartbeat,
  },
  physician: {
    accent: "text-emerald-600 dark:text-emerald-400",
    soft: "bg-emerald-500/10",
    icon: IconStethoscope,
  },
  dentist: {
    accent: "text-primary",
    soft: "bg-primary/10",
    icon: IconDental,
  },
}

function statusBadge(board: StationBoard) {
  if (board.status === "on_break") {
    return { label: "On Break", variant: "secondary" as const }
  }
  if (board.status === "active") {
    return { label: "Active", variant: "default" as const }
  }
  return { label: "Idle", variant: "outline" as const }
}

export function StationCard({ board }: { board: StationBoard }) {
  const tone = stationTone[board.station]
  const Icon = tone.icon
  const badge = statusBadge(board)
  const resumeLabel = formatResumeClock(board.resumesAt)
  const onBreak = board.status === "on_break"

  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden shadow-none dark:ring-0",
        onBreak && "ring-2 ring-amber-500/40"
      )}
    >
      <CardHeader className="gap-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-xl",
                onBreak ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : tone.soft,
                !onBreak && tone.accent
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            Station
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <CardTitle
          className={cn(
            "text-3xl font-bold uppercase",
            onBreak ? "text-amber-700 dark:text-amber-400" : tone.accent
          )}
        >
          {board.label}
        </CardTitle>
        {onBreak ? (
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {resumeLabel
              ? `On break · resumes ~${resumeLabel}`
              : "On break · please wait"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {board.waitingCount} waiting · ~{board.averageWaitMinutes} min wait
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-(--card-spacing)">
        <div
          className={cn(
            "rounded-2xl px-4 py-6 text-center",
            onBreak ? "bg-amber-500/10" : tone.soft
          )}
        >
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {onBreak ? "Station status" : "Now serving"}
          </p>
          <p
            className={cn(
              "mt-2 font-mono text-5xl font-bold tabular-nums md:text-6xl",
              onBreak
                ? "text-amber-700 dark:text-amber-400"
                : tone.accent
            )}
          >
            {onBreak ? "BREAK" : (board.nowServing ?? "—")}
          </p>
        </div>
        {!onBreak && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Upcoming
            </p>
            {board.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other tickets in line
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {board.upcoming.map((ticket) => (
                  <li
                    key={ticket}
                    className="rounded-full bg-muted px-3 py-1 font-mono text-sm font-semibold tabular-nums"
                  >
                    {ticket}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
