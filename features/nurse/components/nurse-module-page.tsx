import { PageHeader } from "@/features/common/components/page-header"
import { StateBlock } from "@/features/common/components/state-block"
import {
  nurseModuleSeeds,
  type NurseModuleKey,
} from "@/features/nurse/data/nurse-modules"

type NurseModulePageProps = {
  module: NurseModuleKey
}

/** Lightweight placeholder until real module workflows ship. */
export function NurseModulePage({ module }: NurseModulePageProps) {
  const seed = nurseModuleSeeds[module]

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
        description={`Planned next: ${seed.nextActions.join(", ")}.`}
      />
    </div>
  )
}
