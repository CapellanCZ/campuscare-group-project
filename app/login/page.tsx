import { AuthPage } from "@/components/auth/auth-page"

function sessionNoticeForReason(reason: string | undefined) {
  if (reason === "idle") {
    return "You were signed out after a period of inactivity. Sign in again to continue."
  }
  if (reason === "absolute") {
    return "Your session expired. Sign in again to continue."
  }
  return null
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const params = await searchParams
  return <AuthPage sessionNotice={sessionNoticeForReason(params.reason)} />
}
