import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function DentistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleRouteGuard expectedRole="dentist">{children}</RoleRouteGuard>
}
