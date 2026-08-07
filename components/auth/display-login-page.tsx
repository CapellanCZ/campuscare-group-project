"use client"

import { useState } from "react"
import Link from "next/link"
import { IconAt, IconChevronLeft, IconLock } from "@tabler/icons-react"

import { signInDisplayAccount } from "@/app/auth/actions"
import { CampusCareLogo } from "@/components/campuscare-logo"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { FloatingPaths } from "@/components/floating-paths"
import { asErrorMessage } from "@/lib/auth/errors"
import { isValidEmail } from "@/lib/auth/email"

/**
 * Queue display kiosk login (email + password).
 *
 * Supabase setup (once):
 * 1. Auth → Users → Add user (email + password; enable Email password provider).
 * 2. public.users: same id, primary_role = 'queue_display', is_active = true.
 * 3. public.clinic_members: clinic_id = campus UUID, member_role = 'queue_display', is_active = true.
 *
 * Entry: triple-click CampusCare logo on /login (no public button).
 */
export function DisplayLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
        <CampusCareLogo
          alt="CampusCare"
          className="relative z-10 mr-auto h-10 w-auto"
          width={160}
          height={40}
          priority
        />
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">Public queue display sign-in</p>
            <footer className="font-mono text-sm font-semibold">
              Display account only
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col justify-center px-8">
        <Button
          className="absolute top-7 left-5"
          variant="ghost"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          <IconChevronLeft data-icon="inline-start" />
          Staff login
        </Button>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-1">
            <h1 className="text-2xl font-bold tracking-wide">Queue display</h1>
            <p className="text-base text-muted-foreground">
              Sign in with the display email and password.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              data-invalid={error ? true : undefined}
              className="max-w-sm"
            >
              <FieldLabel htmlFor="display-email" className="sr-only">
                Email
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="display-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="display@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={pending}
                  required
                  aria-invalid={error ? true : undefined}
                />
                <InputGroupAddon align="inline-start">
                  <IconAt aria-hidden />
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field className="max-w-sm" data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="display-password" className="sr-only">
                Password
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="display-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={pending}
                  required
                  aria-invalid={error ? true : undefined}
                />
                <InputGroupAddon align="inline-start">
                  <IconLock aria-hidden />
                </InputGroupAddon>
              </InputGroup>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </Field>

            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Open display"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
