import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta"

type StatCardProps = {
  label: string
  value: string
  description?: string
  delta?: number
  lowerIsBetter?: boolean
  className?: string
  icon?: React.ReactNode
}

export function StatCard({
  label,
  value,
  description,
  delta,
  lowerIsBetter = false,
  className,
  icon,
}: StatCardProps) {
  return (
    <Card className={cn("min-w-0 shadow-none dark:ring-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="font-normal text-muted-foreground text-xs">
          {label}
        </CardTitle>
        {icon ? (
          <div className="text-muted-foreground [&_svg]:size-4">{icon}</div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="truncate font-semibold text-2xl tabular-nums">{value}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
          {typeof delta === "number" ? (
            <Delta value={delta}>
              <DeltaIcon />
              <DeltaValue />
            </Delta>
          ) : null}
          {description ? (
            <span className="truncate text-muted-foreground">{description}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
