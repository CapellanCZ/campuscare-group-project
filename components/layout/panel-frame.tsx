import { cn } from "@/lib/utils"

/** Efferd-style page intro: tight title stack, room for actions. */
export function PageIntro({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-semibold text-xl leading-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-base text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </div>
  )
}

/** Outer rounded frame — one composition, not floating cards. */
export function PanelFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-border",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Hairline grid: cells separated by `gap-px` on `bg-border`. */
export function PanelGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-px bg-border", className)}>
      {children}
    </div>
  )
}

/** Single panel cell — always opaque background, no radius. */
export function PanelCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 bg-background", className)}>{children}</div>
  )
}

/** Flush card chrome for cells inside PanelFrame (Efferd dashboard pattern). */
export const panelCardClassName =
  "rounded-none bg-background shadow-none ring-0 dark:ring-0"
