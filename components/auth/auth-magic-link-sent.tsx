"use client"

import { IconCircleCheck, IconMail, IconRefreshDot } from "@tabler/icons-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { AuthDivider } from "@/components/auth/auth-divider"
import { maskEmail } from "@/lib/auth/email"

type AuthMagicLinkSentProps = {
  email: string
  isResending: boolean
  isSendingOtp: boolean
  resendSeconds: number
  onResend: () => void
  onSwitchToOtp: () => void
  onBackToEmail: () => void
}

export function AuthMagicLinkSent({
  email,
  isResending,
  isSendingOtp,
  resendSeconds,
  onResend,
  onSwitchToOtp,
  onBackToEmail,
}: AuthMagicLinkSentProps) {
  const isBusy = isResending || isSendingOtp

  return (
    <>
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-wide">Check your email</h1>
        <p className="text-base text-muted-foreground">
          We sent a magic link to{" "}
          <span className="font-medium text-foreground">{maskEmail(email)}</span>
          .
        </p>
      </div>

      <Alert variant="success">
        <IconCircleCheck aria-hidden />
        <AlertTitle>Magic link sent</AlertTitle>
        <AlertDescription>
          Open the email and click the link to finish signing in. The link
          expires in 15 minutes.
        </AlertDescription>
      </Alert>

      <Empty className="border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMail aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Waiting for you to open the link</EmptyTitle>
          <EmptyDescription>
            Check your inbox and spam folder. Keep this tab open until you
            continue from the email.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onResend}
            disabled={resendSeconds > 0 || isBusy}
            aria-label={
              resendSeconds > 0
                ? `Resend magic link in ${resendSeconds} seconds`
                : "Resend magic link"
            }
          >
            <IconRefreshDot data-icon="inline-start" aria-hidden />
            {isResending
              ? "Resending..."
              : resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : "Resend magic link"}
          </Button>
        </EmptyContent>
      </Empty>

      <AuthDivider>OR</AuthDivider>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onSwitchToOtp}
        disabled={isBusy}
      >
        {isSendingOtp ? "Sending code..." : "Use one-time password instead"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onBackToEmail}
        disabled={isBusy}
      >
        Use a different email
      </Button>
    </>
  )
}
