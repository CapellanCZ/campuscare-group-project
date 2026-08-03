"use client"

import { DemoPageHeader } from "@/components/demo/demo-page"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import type { StaffAccess } from "@/lib/auth/types"

/** Legacy stub — admin staff management uses the live UserManagementPage. */
export function UsersDemoPage({ access }: { access: StaffAccess }) {
  return (
    <div className="flex flex-col gap-6">
      <DemoPageHeader
        title="Staff users"
        description="Staff directory is managed in User management."
        designation={access.designation}
        showDemoBanner={false}
      />
      <Empty className="border py-12">
        <EmptyHeader>
          <EmptyTitle>No demo staff directory</EmptyTitle>
          <EmptyDescription>
            Open User management for live clinic staff accounts.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
