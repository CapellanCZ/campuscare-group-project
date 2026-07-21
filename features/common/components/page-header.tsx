import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Fragment } from "react"

type PageHeaderProps = {
  title: string
  subtitle: string
  description?: string
  breadcrumbs?: string[]
}

export function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbs = ["Dashboard", title],
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={`${crumb}-${index}`}>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs text-muted-foreground">
                  {crumb}
                </BreadcrumbPage>
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm font-medium text-[#2563EB]">{subtitle}</p>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  )
}
