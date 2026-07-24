import { IdleSessionProvider } from "@/components/auth/idle-session-provider"

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <IdleSessionProvider>{children}</IdleSessionProvider>
}
