"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { IconChevronLeft } from "@tabler/icons-react"

import { AuthEmailStep } from "@/components/auth/auth-email-step"
import { AuthOtpStep } from "@/components/auth/auth-otp-step"
import { CampusCareLogo } from "@/components/campuscare-logo"
import { Button } from "@/components/ui/button"
import { FloatingPaths } from "@/components/floating-paths"
import {
  RESEND_COOLDOWN_SECONDS,
  sendOtp,
  verifyOtp,
} from "@/lib/auth/auth-api"
import { asErrorMessage } from "@/lib/auth/errors"
import { isValidEmail } from "@/lib/auth/email"

type AuthStep = "email" | "otp"

export function AuthPage() {
  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (resendSeconds <= 0) return

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const validateEmail = useCallback(() => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setEmailError("Enter your work email to continue.")
      return null
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Enter a valid email address.")
      return null
    }

    setEmailError(null)
    return trimmedEmail
  }, [email])

  const handleSendOtp = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    const trimmedEmail = validateEmail()
    if (!trimmedEmail) return

    setIsSendingOtp(true)
    setOtpError(null)

    const result = await sendOtp(trimmedEmail)

    setIsSendingOtp(false)

    if (!result.ok) {
      setEmailError(
        asErrorMessage(result.error, "Could not send sign-in email.")
      )
      return
    }

    setEmail(trimmedEmail)
    setOtp("")
    setStep("otp")
    setResendSeconds(RESEND_COOLDOWN_SECONDS)
  }

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || isSendingOtp) return
    await handleSendOtp()
  }

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsVerifying(true)
    setOtpError(null)

    try {
      const result = await verifyOtp(email, otp)

      if (!result.ok) {
        setOtpError(asErrorMessage(result.error, "Could not verify that code."))
        setIsVerifying(false)
        return
      }

      // Hard navigation avoids leaving this screen stuck on "Verifying..."
      // while /auth/continue resolves the role home.
      window.location.assign("/auth/continue")
    } catch {
      setOtpError("Could not verify that code.")
      setIsVerifying(false)
    }
  }

  const handleBackToEmail = () => {
    setStep("email")
    setOtp("")
    setOtpError(null)
    setEmailError(null)
    setResendSeconds(0)
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
            <p className="text-xl">
              &ldquo;I&apos;m a bulldog. I refuse to lose, and I&apos;m always
              going to compete. I guarantee I&apos;m going to give everything I
              can.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">
              ~ Jason Place
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col justify-center px-8">
        <div
          aria-hidden
          className="absolute inset-0 isolate -z-10 opacity-60 contain-strict"
        >
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>

        <Button
          className="absolute top-7 left-5"
          variant="ghost"
          render={<Link href="/" />}
          nativeButton={false}
        >
          <IconChevronLeft data-icon="inline-start" />
          Home
        </Button>

        <div className="mx-auto w-full max-w-sm space-y-4">
          {step === "email" ? (
            <AuthEmailStep
              email={email}
              emailError={emailError}
              isSendingOtp={isSendingOtp}
              onEmailChange={(value) => {
                setEmail(value)
                if (emailError) setEmailError(null)
              }}
              onSendOtp={handleSendOtp}
            />
          ) : null}

          {step === "otp" ? (
            <AuthOtpStep
              email={email}
              otp={otp}
              otpError={otpError}
              otpNotice={null}
              isVerifying={isVerifying}
              isResending={isSendingOtp}
              resendSeconds={resendSeconds}
              onOtpChange={(value) => {
                setOtp(value)
                if (otpError) setOtpError(null)
              }}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBackToEmail={handleBackToEmail}
            />
          ) : null}

          <p className="mt-8 text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a
              className="underline underline-offset-4 hover:text-primary"
              href="#"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="underline underline-offset-4 hover:text-primary"
              href="#"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
