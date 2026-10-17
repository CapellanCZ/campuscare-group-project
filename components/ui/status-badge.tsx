import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  label: string
  toneClassName: string
  dotClassName: string
  className?: string
}

/** Outline status pill with a colored indicator dot on the left. */
export function StatusBadge({
  label,
  toneClassName,
  dotClassName,
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 capitalize", toneClassName, className)}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dotClassName)}
        aria-hidden
      />
      {label}
    </Badge>
  )
}
