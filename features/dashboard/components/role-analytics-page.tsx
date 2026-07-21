import { PageHeader } from "@/features/common/components/page-header"
import { StateBlock } from "@/features/common/components/state-block"
import type { WebRole } from "@/lib/auth/types"

const analyticsCopy: Record<WebRole, { subtitle: string; description: string }> = {
  admin: {
    subtitle: "System-wide performance insights",
    description:
      "Track consultation volume, queue throughput, and clinic utilization across departments.",
  },
  nurse: {
    subtitle: "Queue and intake insights",
    description:
      "Monitor wait times, intake volume, and assessment completion trends.",
  },
  physician: {
    subtitle: "Consultation and care metrics",
    description:
      "Review appointment trends, patient load, and consultation outcomes.",
  },
  dentist: {
    subtitle: "Dental care metrics",
    description:
      "Review consultation volume, procedure trends, and patient follow-ups.",
  },
}

type RoleAnalyticsPageProps = {
  role: WebRole
}

export function RoleAnalyticsPage({ role }: RoleAnalyticsPageProps) {
  const copy = analyticsCopy[role]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={copy.subtitle}
        description={copy.description}
      />
      <StateBlock
        state="empty"
        title="Analytics dashboard coming soon"
        description="Charts and reports for this workspace are being prepared."
      />
    </div>
  )
}
