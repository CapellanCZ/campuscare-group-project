"use client"

import { IconRefreshDot } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { OTP_LENGTH } from "@/lib/auth/auth-api"
import { maskEmail } from "@/lib/auth/email"

const otpSlotClassName =
  "min-w-0 flex-1 *:data-[slot=input-otp-slot]:h-10 *:data-[slot=input-otp-slot]:w-0 *:data-[slot=input-otp-slot]:min-w-0 *:data-[slot=input-otp-slot]:flex-1 *:data-[slot=input-otp-slot]:text-lg sm:*:data-[slot=input-otp-slot]:h-11 sm:*:data-[slot=input-otp-slot]:text-xl"

type AuthOtpStepProps = {
  email: string
  otp: string
  otpError: string | null
  otpNotice: string | null
  isVerifying: boolean
  isResending: boolean
  resendSeconds: number
  onOtpChange: (value: string) => void
  onVerify: (event: React.FormEvent<HTMLFormElement>) => void
  onResend: () => void
  onBackToEmail: () => void
}

export function AuthOtpStep({
  email,
  otp,
  otpError,
  otpNotice,
  isVerifying,
  isResending,
  resendSeconds,
  onOtpChange,
  onVerify,
  onResend,
  onBackToEmail,
}: AuthOtpStepProps) {
  const isBusy = isVerifying || isResending

  return (
    <>
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-wide">Verify your login</h1>
        <p className="text-base text-muted-foreground">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-foreground">{maskEmail(email)}</span>
          .
        </p>
      </div>

      <form className="space-y-4" onSubmit={onVerify} noValidate>
        <Field data-invalid={otpError ? true : undefined}>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <FieldLabel htmlFor="otp-verification">Verification code</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="shrink-0"
              onClick={onResend}
              disabled={resendSeconds > 0 || isBusy}
              aria-label={
                resendSeconds > 0
                  ? `Resend code in ${resendSeconds} seconds`
                  : "Resend verification code"
              }
            >
              <IconRefreshDot data-icon="inline-start" aria-hidden />
              {isResending
                ? "Sending..."
                : resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : "Resend code"}
            </Button>
          </div>

          <InputOTP
            maxLength={OTP_LENGTH}
            id="otp-verification"
            value={otp}
            onChange={onOtpChange}
            required
            autoFocus
            containerClassName="w-full justify-between gap-2"
            aria-invalid={otpError ? true : undefined}
            disabled={isBusy}
          >
            <InputOTPGroup className={otpSlotClassName}>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator className="mx-1 shrink-0" />
            <InputOTPGroup className={otpSlotClassName}>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <FieldDescription>
            {otpNotice ??
              "Check your inbox and spam folder if the code hasn't arrived yet."}
          </FieldDescription>
          <FieldError role="alert">{otpError}</FieldError>
        </Field>

        <Button className="w-full" type="submit" disabled={isBusy}>
          {isVerifying ? "Verifying..." : "Verify and continue"}
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
      </form>
    </>
  )
}
