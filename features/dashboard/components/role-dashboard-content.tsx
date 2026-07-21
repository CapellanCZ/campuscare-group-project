import { IconListDetails } from "@tabler/icons-react"

import { DataTableShell } from "@/features/common/components/data-table-shell"
import { PageHeader } from "@/features/common/components/page-header"
import { SearchFilterBar } from "@/features/common/components/search-filter-bar"
import { StateBlock } from "@/features/common/components/state-block"
import { SummaryCard } from "@/features/common/components/summary-card"
import { roleDashboardSeed } from "@/features/dashboard/data/role-dashboard"
import { getRoleMeta } from "@/lib/navigation/role-nav"
import type { WebRole } from "@/lib/auth/types"

type RoleDashboardContentProps = {
  role: WebRole
}

export function RoleDashboardContent({ role }: RoleDashboardContentProps) {
  const meta = getRoleMeta(role)
  const seed = roleDashboardSeed[role]

  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        description={meta.description}
        breadcrumbs={["Dashboard", role.toUpperCase()]}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {seed.metrics.map((metric) => (
          <SummaryCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            hint={metric.hint}
            icon={<IconListDetails className="size-4" />}
          />
        ))}
      </section>

      <SearchFilterBar searchPlaceholder="Search by patient, request, queue, or certificate..." />

      <DataTableShell title="Recent Module Activity" rows={seed.rows} />

      <StateBlock
        state="empty"
        title="More module pages are being prepared"
        description={`Phase 1 foundation is active. Next pages to scaffold for ${role}: ${seed.quickModules.join(", ")}.`}
      />
    </div>
  )
}
