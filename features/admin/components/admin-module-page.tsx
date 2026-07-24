import { PageHeader } from "@/features/common/components/page-header"
import { StateBlock } from "@/features/common/components/state-block"
import {
  adminModuleSeeds,
  type AdminModuleKey,
} from "@/features/admin/data/admin-modules"

type AdminModulePageProps = {
  module: AdminModuleKey
}

/** Lightweight placeholder until real module CRUD ships. */
export function AdminModulePage({ module }: AdminModulePageProps) {
  const seed = adminModuleSeeds[module]

  return (
    <div className="space-y-6">
      <PageHeader
        title={seed.title}
        subtitle={seed.subtitle}
        description={seed.description}
      />
      <StateBlock
        state="empty"
        title={`${seed.title} is ready for the next build`}
        description="Navigation and access control are live. Full workflows for this module land in a later phase."
      />
    </div>
  )
}
