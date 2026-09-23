import { StaffSessionShell } from "@/components/staff-session-shell"
import { privateSurfaceMetadata } from "@/lib/landing/seo"

export const metadata = privateSurfaceMetadata

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StaffSessionShell>{children}</StaffSessionShell>
}
