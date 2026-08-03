import { Badge } from "@/components/reui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/features/common/components/page-header"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import { CLINIC_TIMEZONE } from "@/features/physician/types"

type ProfilePageProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianProfilePage({ workspace }: ProfilePageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Physician account"
        description="Identity used across the clinic dashboard and consultation records."
      />

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{workspace.doctorName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileField label="Email" value={workspace.doctorEmail} />
            <ProfileField label="Role" value="Physician" />
            <ProfileField
              label="License"
              value="Linked via staff profile"
            />
            <ProfileField label="Default timezone" value={CLINIC_TIMEZONE} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success-light" size="sm">
              Clinic staff web access
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
    </div>
  )
}
