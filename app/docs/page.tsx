import Link from "next/link"

import { PageHeader } from "@/features/common/components/page-header"
import { StateBlock } from "@/features/common/components/state-block"
import { Button } from "@/components/ui/button"

export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 p-6">
      <PageHeader
        title="CampusCare docs"
        subtitle="Guides and clinic workflows"
        description="Documentation for staff roles, patient intake, and clinic operations will live here."
      />
      <StateBlock
        state="empty"
        title="Docs are being prepared"
        description="Use Help in the account menu for now, or return to your dashboard."
      />
      <Button render={<Link href="/login" />} nativeButton={false} variant="outline">
        Back to sign in
      </Button>
    </main>
  )
}
