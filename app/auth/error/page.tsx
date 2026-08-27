import Link from "next/link"

import { Button } from "@/components/ui/button"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const isActivation = reason === "activation"

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-wide">
        {isActivation ? "Activation failed" : "Sign-in failed"}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {isActivation
          ? "That activation link is invalid or expired. Ask an admin to resend your invite, then open the newest email."
          : "That sign-in session is invalid or expired. Request a new one-time password from the sign-in page."}
      </p>
      <Button render={<Link href="/login" />} nativeButton={false}>
        Back to sign in
      </Button>
    </main>
  )
}
