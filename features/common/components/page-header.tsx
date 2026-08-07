type PageHeaderProps = {
  title: string
  subtitle?: string
  description?: string
}

export function PageHeader({
  title,
  subtitle,
  description,
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <div>
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
    </header>
  )
}
