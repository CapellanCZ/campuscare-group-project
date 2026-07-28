import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta"
import { panelCardClassName } from "@/components/layout/panel-frame"

type StatCardProps = {
  label: string
  value: string
  description?: string
  delta?: number
  lowerIsBetter?: boolean
  className?: string
  icon?: React.ReactNode
  /** Efferd flush cell — no radius/ring when nested in PanelFrame */
  flush?: boolean
}

export function StatCard({
  label,
  value,
  description,
  delta,
  className,
  icon,
  flush = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "min-w-0 shadow-none dark:ring-0",
        flush && panelCardClassName,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="font-normal text-xs tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        {icon ? (
          <div className="text-muted-foreground [&_svg]:size-4">{icon}</div>
        ) : typeof delta === "number" ? (
          <CardDescription className="flex items-center gap-1 text-xs tabular-nums">
            <Delta value={delta}>
              <DeltaIcon />
              <DeltaValue />
            </Delta>
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-row items-center gap-2">
        <p className="truncate font-medium text-xl tabular-nums">{value}</p>
        {description && typeof delta !== "number" ? (
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
