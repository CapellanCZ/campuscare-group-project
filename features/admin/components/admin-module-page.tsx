import { IconShieldCheck } from "@tabler/icons-react"

import { DataTableShell } from "@/features/common/components/data-table-shell"
import { PageHeader } from "@/features/common/components/page-header"
import { SearchFilterBar } from "@/features/common/components/search-filter-bar"
import { StateBlock } from "@/features/common/components/state-block"
import { SummaryCard } from "@/features/common/components/summary-card"
import {
  adminModuleSeeds,
  type AdminModuleKey,
} from "@/features/admin/data/admin-modules"

type AdminModulePageProps = {
  module: AdminModuleKey
}

export function AdminModulePage({ module }: AdminModulePageProps) {
  const seed = adminModuleSeeds[module]

  return (
    <div className="space-y-6">
      <PageHeader
        title={seed.title}
        subtitle={seed.subtitle}
        description={seed.description}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {seed.metrics.map((metric) => (
          <SummaryCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            hint={metric.hint}
            icon={<IconShieldCheck className="size-4" />}
          />
        ))}
      </section>

      <SearchFilterBar searchPlaceholder={`Search ${seed.title.toLowerCase()} records...`} />

      <DataTableShell title={`${seed.title} Activity`} rows={seed.rows} />

      <StateBlock
        state="empty"
        title={`${seed.title} advanced actions are coming next`}
        description="Phase 1 delivers route guards, role-aware navigation, and reusable page scaffolds. Full CRUD and integrations follow in the next phase."
      />
    </div>
  )
}
