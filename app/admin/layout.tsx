import { StaffRoleLayout } from "@/components/staff-role-layout"
import { privateSurfaceMetadata } from "@/lib/landing/seo"

export const metadata = privateSurfaceMetadata

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StaffRoleLayout role="admin">{children}</StaffRoleLayout>
}
