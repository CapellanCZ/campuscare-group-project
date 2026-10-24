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
  const canResend = resendSeconds <= 0 && !isBusy

  return (
    <>
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Verify your login
        </h1>
        <p className="text-base text-slate-500">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-slate-800">{maskEmail(email)}</span>
          .
        </p>
      </div>

      <form className="space-y-5" onSubmit={onVerify} noValidate>
        <Field data-invalid={otpError ? true : undefined}>
          <FieldLabel htmlFor="otp-verification" className="text-slate-700">
            Verification code
          </FieldLabel>

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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FieldDescription className="text-slate-500 sm:max-w-[16rem]">
              {otpNotice ??
                "Check your inbox and spam folder if the code hasn't arrived yet."}
            </FieldDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-lg border-slate-200 text-slate-700"
              onClick={onResend}
              disabled={!canResend}
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

          {typeof otpError === "string" && otpError ? (
            <FieldError role="alert">{otpError}</FieldError>
          ) : null}
        </Field>

        <Button
          className="h-11 w-full rounded-xl bg-blue-600 text-base hover:bg-blue-700"
          type="submit"
          disabled={isBusy}
        >
          {isVerifying ? "Verifying..." : "Verify and continue"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-slate-600 hover:text-slate-900"
          onClick={onBackToEmail}
          disabled={isBusy}
        >
          Use a different email
        </Button>
      </form>
    </>
  )
}
