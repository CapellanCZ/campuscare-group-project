import Link from "next/link"
import { redirect } from "next/navigation"

import { signOut } from "@/app/auth/actions"
import { getStaffAccess } from "@/lib/auth/access"
import { homePathForDesignation } from "@/lib/auth/home-path"
import { Button } from "@/components/ui/button"

export default async function AuthPendingPage() {
  const access = await getStaffAccess()

  if (!access) {
    redirect("/")
  }

  if (access.hasClinicMembership) {
    redirect(homePathForDesignation(access.primaryRole))
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-wide">Invite pending</h1>
      <p className="max-w-md text-muted-foreground">
        You&apos;re signed in as{" "}
        <span className="font-medium text-foreground">{access.email}</span>, but
        you don&apos;t have clinic access yet. Ask a clinic admin to add you as
        staff.
      </p>
      <form
        action={async () => {
          "use server"
          await signOut()
          redirect("/")
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
      <Button variant="ghost" render={<Link href="/" />} nativeButton={false}>
        Back to sign in
      </Button>
    </main>
  )
}
