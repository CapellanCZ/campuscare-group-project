import { StaffRoleLayout } from "@/components/staff-role-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StaffRoleLayout role="nurse">{children}</StaffRoleLayout>
}
