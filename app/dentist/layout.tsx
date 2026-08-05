import { StaffRoleLayout } from "@/components/staff-role-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StaffRoleLayout role="dentist">
      <div className="dentist-workspace flex flex-1 flex-col gap-2 [&_.gap-6]:gap-8 [&_.gap-8]:gap-10 [&_.px-6]:px-7 [&_.py-5]:py-6 [&_.gap-2]:gap-3">
        {children}
      </div>
    </StaffRoleLayout>
  )
}
