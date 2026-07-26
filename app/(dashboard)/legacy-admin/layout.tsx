import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleRouteGuard expectedRole="admin">{children}</RoleRouteGuard>
}
