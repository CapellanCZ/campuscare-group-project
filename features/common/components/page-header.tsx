import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  subtitle?: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm font-medium text-primary">{subtitle}</p>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
