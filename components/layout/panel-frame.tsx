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
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-balance sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:w-auto sm:shrink-0 sm:items-center [&_a]:min-w-0 [&_a]:flex-1 sm:[&_a]:flex-none [&_button]:min-w-0 [&_button]:flex-1 sm:[&_button]:flex-none">
          {action}
        </div>
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
