"use client"

import Link from "next/link"
import { IconAt } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { AuthDivider } from "@/components/auth/auth-divider"

type AuthEmailStepProps = {
  email: string
  emailError: string | null
  sessionNotice?: string | null
  isSendingOtp: boolean
  onEmailChange: (value: string) => void
  onSendOtp: (event: React.FormEvent<HTMLFormElement>) => void
}

export function AuthEmailStep({
  email,
  emailError,
  sessionNotice = null,
  isSendingOtp,
  onEmailChange,
  onSendOtp,
}: AuthEmailStepProps) {
  return (
    <>
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-wide">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Enter your work email to continue.
        </p>
      </div>

      {sessionNotice ? (
        <p
          role="status"
          className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          {sessionNotice}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={onSendOtp} noValidate>
        <Field
          className="max-w-sm"
          data-invalid={emailError ? true : undefined}
        >
          <FieldLabel htmlFor="work-email" className="sr-only">
            Work email
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="work-email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="your.email@example.com"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              aria-invalid={emailError ? true : undefined}
              required
              disabled={isSendingOtp}
              maxLength={254}
              spellCheck={false}
            />
            <InputGroupAddon align="inline-start">
              <IconAt aria-hidden />
            </InputGroupAddon>
          </InputGroup>
          <FieldError role="alert">{emailError}</FieldError>
        </Field>

        <p className="text-start text-xs text-muted-foreground">
          We&apos;ll send a one-time password (OTP) to verify your email.
        </p>

        <Button className="w-full" type="submit" disabled={isSendingOtp}>
          {isSendingOtp ? "Sending code..." : "One-Time Password (OTP)"}
        </Button>
      </form>

      {process.env.NODE_ENV === "development" ? (
        <>
          <AuthDivider>TESTING</AuthDivider>
          <Button
            className="w-full"
            type="button"
            variant="ghost"
            render={<Link href="/admin/dashboard" />}
            nativeButton={false}
          >
            Skip to dashboard
          </Button>
        </>
      ) : null}
    </>
  )
}
