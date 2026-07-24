import { PageHeader } from "@/features/common/components/page-header"
import { StateBlock } from "@/features/common/components/state-block"
import { roleDashboardSeed } from "@/features/dashboard/data/role-dashboard"
import { getRoleMeta } from "@/lib/navigation/role-meta"
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
      />
      <StateBlock
        state="empty"
        title="Module workspace coming next"
        description={`Foundation is live for ${role}. Next: ${seed.quickModules.join(", ")}.`}
      />
    </div>
  )
}
