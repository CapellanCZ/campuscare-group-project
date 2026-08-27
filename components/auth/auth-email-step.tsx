"use client"

import { IconAt } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

type AuthEmailStepProps = {
  email: string
  emailError: string | null
  emailNotice?: string | null
  isSendingOtp: boolean
  onEmailChange: (value: string) => void
  onSendOtp: (event: React.FormEvent<HTMLFormElement>) => void
}

export function AuthEmailStep({
  email,
  emailError,
  emailNotice = null,
  isSendingOtp,
  onEmailChange,
  onSendOtp,
}: AuthEmailStepProps) {
  return (
    <>
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-wide">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Enter your work email and we&apos;ll send a one-time password.
        </p>
        {emailNotice ? (
          <p className="text-sm text-foreground" role="status">
            {emailNotice}
          </p>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={onSendOtp} noValidate>
        <Field
          className="max-w-sm"
          data-invalid={
            typeof emailError === "string" && emailError ? true : undefined
          }
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
              aria-invalid={
                typeof emailError === "string" && emailError ? true : undefined
              }
              required
              disabled={isSendingOtp}
            />
            <InputGroupAddon align="inline-start">
              <IconAt aria-hidden />
            </InputGroupAddon>
          </InputGroup>
          {typeof emailError === "string" &&
          emailError &&
          emailError !== "{}" ? (
            <p role="alert" className="text-sm text-destructive">
              {emailError}
            </p>
          ) : null}
        </Field>

        <p className="text-start text-xs text-muted-foreground">
          We&apos;ll email a 6-digit code. No password needed.
        </p>

        <Button className="w-full" type="submit" disabled={isSendingOtp}>
          {isSendingOtp ? "Sending code..." : "Send one-time password"}
        </Button>
      </form>
    </>
  )
}
