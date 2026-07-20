"use client"

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
  isSendingMagicLink: boolean
  isSendingOtp: boolean
  onEmailChange: (value: string) => void
  onSendMagicLink: (event: React.FormEvent<HTMLFormElement>) => void
  onSendOtp: () => void
}

export function AuthEmailStep({
  email,
  emailError,
  isSendingMagicLink,
  isSendingOtp,
  onEmailChange,
  onSendMagicLink,
  onSendOtp,
}: AuthEmailStepProps) {
  const isBusy = isSendingMagicLink || isSendingOtp

  return (
    <>
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-wide">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Enter your work email to continue with a magic link or one-time
          password.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSendMagicLink} noValidate>
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
              disabled={isBusy}
            />
            <InputGroupAddon align="inline-start">
              <IconAt aria-hidden />
            </InputGroupAddon>
          </InputGroup>
          <FieldError>{emailError}</FieldError>
        </Field>

        <p className="text-start text-xs text-muted-foreground">
          We&apos;ll send a secure link to sign in without a password.
        </p>

        <Button
          className="w-full"
          type="submit"
          disabled={isBusy}
        >
          {isSendingMagicLink ? "Sending magic link..." : "Send magic link"}
        </Button>
      </form>

      <AuthDivider>OR</AuthDivider>

      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={onSendOtp}
      >
        {isSendingOtp ? "Sending code..." : "One-Time Password (OTP)"}
      </Button>
    </>
  )
}
