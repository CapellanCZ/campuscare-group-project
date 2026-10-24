"use client"

import { useState } from "react"
import Link from "next/link"
import {
  IconAt,
  IconChevronLeft,
  IconEye,
  IconEyeOff,
  IconLock,
  IconScreenShare,
} from "@tabler/icons-react"

import { signInDisplayAccount } from "@/app/auth/actions"
import { CampusCareLogoStatic } from "@/components/campuscare-logo-static"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { asErrorMessage } from "@/lib/auth/errors"
import { isValidEmail } from "@/lib/auth/email"
import { cn } from "@/lib/utils"

const fieldGroupClassName = cn(
  "h-11 rounded-xl border-slate-200 bg-white",
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
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Enter the display account email.")
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.")
      return
    }
    if (!password) {
      setError("Enter the display account password.")
      return
    }

    setPending(true)
    setError(null)
    try {
      const result = await signInDisplayAccount(trimmedEmail, password)
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
      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-14">
        <Button
          className="absolute top-6 left-4 text-slate-600 sm:left-8"
          variant="ghost"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          <IconChevronLeft data-icon="inline-start" />
          Staff login
        </Button>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center space-y-8 pt-14 lg:pt-0">
          <CampusCareLogoStatic
            variant="blue"
            alt="CampusCare"
            className="h-9 w-auto"
            width={140}
            priority
          />

          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Queue display
              </h1>
              <p className="text-base text-slate-500">
                Sign in with the display account email and password to open the
                public waiting-room screen.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="display-email" className="text-slate-700">
                  Display email
                </FieldLabel>
                <InputGroup className={fieldGroupClassName}>
                  <InputGroupInput
                    id="display-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="display@clinic.edu"
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
                  <InputGroupAddon align="inline-start">
                    <IconAt aria-hidden className="text-slate-400" />
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <Field data-invalid={error ? true : undefined}>
                <FieldLabel
                  htmlFor="display-password"
                  className="text-slate-700"
                >
                  Password
                </FieldLabel>
                <InputGroup className={fieldGroupClassName}>
                  <InputGroupInput
                    id="display-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
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
                  <InputGroupAddon align="inline-start">
                    <IconLock aria-hidden className="text-slate-400" />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-slate-500 hover:text-slate-800"
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
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </Field>

              <Button
                className="h-11 w-full rounded-xl bg-blue-600 text-base hover:bg-blue-700"
                type="submit"
                disabled={pending}
              >
                {pending ? "Signing in…" : "Open display"}
              </Button>

              <p className="text-center text-xs text-slate-500">
                For TV / waiting-room kiosks only. Use staff login for clinic
                work.
              </p>
            </form>
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-sky-700 lg:block">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 42%), radial-gradient(circle at 80% 70%, rgba(125,211,252,0.35), transparent 40%)",
          }}
        />
        <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-12 text-white">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <IconScreenShare className="size-6" stroke={1.75} aria-hidden />
          </div>
          <div className="max-w-sm space-y-3">
            <p className="text-sm font-semibold tracking-[0.14em] text-sky-100 uppercase">
              Waiting room
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-balance">
              Keep the public queue clear and calm.
            </h2>
            <p className="text-base leading-relaxed text-blue-100">
              This account opens the full-screen ticket display — not the staff
              clinical workspace.
            </p>
          </div>
          <p className="text-sm text-blue-100/80">
            CampusCare · NU Dasmariñas HSO
          </p>
        </div>
      </aside>
    </main>
  )
}
