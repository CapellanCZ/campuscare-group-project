"use client"

import { useState } from "react"
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from "@tabler/icons-react"

import { signInDisplayAccount } from "@/app/auth/actions"
import { DisplayLoginPreview } from "@/components/auth/display-login-preview"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { asErrorMessage } from "@/lib/auth/errors"
import {
  getDisplayLoginEmailDomain,
  resolveDisplayLoginEmail,
} from "@/lib/auth/email"
import { cn } from "@/lib/utils"

const displayLoginDomain = getDisplayLoginEmailDomain()

const fieldGroupClassName = cn(
  "h-11 rounded-lg border border-slate-200 bg-white shadow-none",
  "has-[[data-slot=input-group-control]:focus-visible]:border-blue-600",
  "has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]",
  "has-[[data-slot=input-group-control]:focus-visible]:ring-blue-600/25",
  // Autofill paints only the <input>; keep the whole group one surface.
  "[&_input:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]",
  "[&_input:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff]",
  "[&_input:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]"
)

/**
 * Queue display kiosk login (email + password).
 *
 * Entry: triple-click CampusCare logo on /login (no public button).
 */
export function DisplayLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resolvedEmail = resolveDisplayLoginEmail(email)
    if (!email.trim()) {
      setError("Enter the display username or email.")
      return
    }
    if (!resolvedEmail) {
      setError(
        `Enter a username (e.g. NUHSODisplay) or full email (@${displayLoginDomain}).`
      )
      return
    }
    if (!password) {
      setError("Enter the display account password.")
      return
    }

    setPending(true)
    setError(null)
    try {
      // Pass the raw username/email so the server can map profile usernames
      // (e.g. NUDHSODisplay) to the real Auth email.
      const result = await signInDisplayAccount(email, password)
      if (!result.ok) {
        setError(
          asErrorMessage(result.error, "Could not sign in to the display.")
        )
        setPending(false)
        return
      }
      window.location.assign("/queue-management/display")
    } catch {
      setError("Could not sign in to the display.")
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center">
          <div className="space-y-2">
            <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-slate-900 sm:text-[2.25rem]">
              Welcome Back!
            </h1>
            <p className="text-[0.95rem] leading-relaxed text-slate-500">
              Sign in to open the waiting-room queue display and keep tickets
              clear for patients.
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel
                htmlFor="display-email"
                className="mb-1.5 text-sm font-semibold text-slate-800"
              >
                Username or email
              </FieldLabel>
              <InputGroup className={fieldGroupClassName}>
                <InputGroupAddon align="inline-start">
                  <IconMail
                    aria-hidden
                    className="size-[1.05rem] text-slate-400"
                  />
                </InputGroupAddon>
                <InputGroupInput
                  id="display-email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  inputMode="text"
                  placeholder={`NUDHSODisplay or name@${displayLoginDomain}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={pending}
                  required
                  aria-invalid={error ? true : undefined}
                  className="text-slate-900 placeholder:text-slate-400"
                />
              </InputGroup>
            </Field>

            <Field data-invalid={error ? true : undefined}>
              <FieldLabel
                htmlFor="display-password"
                className="mb-1.5 text-sm font-semibold text-slate-800"
              >
                Password
              </FieldLabel>
              <InputGroup className={fieldGroupClassName}>
                <InputGroupAddon align="inline-start">
                  <IconLock
                    aria-hidden
                    className="size-[1.05rem] text-slate-400"
                  />
                </InputGroupAddon>
                <InputGroupInput
                  id="display-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={pending}
                  required
                  aria-invalid={error ? true : undefined}
                  className="text-slate-900 placeholder:text-slate-400"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-700"
                    disabled={pending}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((open) => !open)}
                  >
                    {showPassword ? (
                      <IconEyeOff aria-hidden />
                    ) : (
                      <IconEye aria-hidden />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {error ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </Field>

            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-lg bg-blue-600 text-base font-semibold text-white shadow-none hover:bg-blue-700"
            >
              {pending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
      </section>

      <DisplayLoginPreview />
    </main>
  )
}
