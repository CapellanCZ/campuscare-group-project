import { StaffSessionShell } from "@/components/staff-session-shell"

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StaffSessionShell>{children}</StaffSessionShell>
}
