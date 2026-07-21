import { IconNurse } from "@tabler/icons-react"

import { DataTableShell } from "@/features/common/components/data-table-shell"
import { PageHeader } from "@/features/common/components/page-header"
import { SearchFilterBar } from "@/features/common/components/search-filter-bar"
import { StateBlock } from "@/features/common/components/state-block"
import { SummaryCard } from "@/features/common/components/summary-card"
import {
  nurseModuleSeeds,
  type NurseModuleKey,
} from "@/features/nurse/data/nurse-modules"

type NurseModulePageProps = {
  module: NurseModuleKey
}

export function NurseModulePage({ module }: NurseModulePageProps) {
  const seed = nurseModuleSeeds[module]

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
            icon={<IconNurse className="size-4" />}
          />
        ))}
      </section>

      <SearchFilterBar searchPlaceholder={`Search ${seed.title.toLowerCase()} records...`} />

      <DataTableShell title={`${seed.title} Activity`} rows={seed.rows} />

      <StateBlock
        state="empty"
        title={`${seed.title} advanced interactions are queued for next phase`}
        description={`Next planned interactions: ${seed.nextActions.join(", ")}.`}
      />
    </div>
  )
}
