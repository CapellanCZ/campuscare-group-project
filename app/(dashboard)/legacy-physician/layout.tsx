import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function PhysicianLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleRouteGuard expectedRole="physician">{children}</RoleRouteGuard>
  )
}
