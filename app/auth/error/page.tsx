import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-wide">Sign-in failed</h1>
      <p className="max-w-md text-muted-foreground">
        That verification session is invalid or expired. Request a new one-time
        password from the sign-in page.
      </p>
      <Button render={<Link href="/login" />} nativeButton={false}>
        Back to sign in
      </Button>
    </main>
  )
}
