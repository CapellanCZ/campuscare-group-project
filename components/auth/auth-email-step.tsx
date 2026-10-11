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
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome Back
        </h1>
        <p className="text-base text-slate-500">
          Enter your work email and we&apos;ll send a one-time password to access
          your account.
        </p>
        {emailNotice ? (
          <p className="text-sm text-slate-700" role="status">
            {emailNotice}
          </p>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={onSendOtp} noValidate>
        <Field
          data-invalid={
            typeof emailError === "string" && emailError ? true : undefined
          }
        >
          <FieldLabel htmlFor="work-email" className="text-slate-700">
            Work email
          </FieldLabel>
          <InputGroup className="h-11 rounded-xl border-slate-200">
            <InputGroupInput
              id="work-email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Enter your email"
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

        <p className="text-start text-xs text-slate-500">
          We&apos;ll email a 6-digit code. No password needed.
        </p>

        <Button
          className="h-11 w-full rounded-xl bg-blue-600 text-base hover:bg-blue-700"
          type="submit"
          disabled={isSendingOtp}
        >
          {isSendingOtp ? "Sending code..." : "Continue"}
        </Button>
      </form>
    </>
  )
}
