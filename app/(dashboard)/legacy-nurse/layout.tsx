import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function NurseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleRouteGuard expectedRole="nurse">{children}</RoleRouteGuard>
}
