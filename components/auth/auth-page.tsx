"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { IconChevronLeft } from "@tabler/icons-react"

import { AuthActivateStep } from "@/components/auth/auth-activate-step"
import { AuthEmailStep } from "@/components/auth/auth-email-step"
import { AuthOtpStep } from "@/components/auth/auth-otp-step"
import { LoginClinicPreview } from "@/components/auth/login-clinic-preview"
import { LoginHistoryGuard } from "@/components/auth/login-history-guard"
import { CampusCareLogoStatic } from "@/components/campuscare-logo-static"
import { Button } from "@/components/ui/button"
import {
  RESEND_COOLDOWN_SECONDS,
  sendOtp,
  verifyOtp,
} from "@/lib/auth/auth-api"
import { asErrorMessage } from "@/lib/auth/errors"
import { isValidEmail } from "@/lib/auth/email"
import { markSessionStarted } from "@/lib/auth/session-timeout"
import { siteRoutes } from "@/lib/site/routes"

type AuthStep = "email" | "otp" | "activate"

const DISPLAY_LOGIN_CLICK_WINDOW_MS = 800
const DISPLAY_LOGIN_CLICKS_REQUIRED = 3

export function AuthPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  /** `undefined` = derive from `?activated=1`; otherwise explicit notice/clear. */
  const [emailNoticeOverride, setEmailNoticeOverride] = useState<
    string | null | undefined
  >(undefined)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const displayLoginClicks = useRef(0)
  const displayLoginTimer = useRef<number | null>(null)

  const emailNotice =
    emailNoticeOverride !== undefined
      ? emailNoticeOverride
      : searchParams.get("activated") === "1"
        ? "Your account is activated. Enter your email to receive a one-time code."
        : null

  useEffect(() => {
    if (resendSeconds <= 0) return

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendSeconds])

  useEffect(() => {
    return () => {
      if (displayLoginTimer.current != null) {
        window.clearTimeout(displayLoginTimer.current)
      }
    }
  }, [])

  const handleDisplayLoginSecret = useCallback(() => {
    displayLoginClicks.current += 1
    if (displayLoginTimer.current != null) {
      window.clearTimeout(displayLoginTimer.current)
    }
    if (displayLoginClicks.current >= DISPLAY_LOGIN_CLICKS_REQUIRED) {
      displayLoginClicks.current = 0
      window.location.assign("/display-login")
      return
    }
    displayLoginTimer.current = window.setTimeout(() => {
      displayLoginClicks.current = 0
      displayLoginTimer.current = null
    }, DISPLAY_LOGIN_CLICK_WINDOW_MS)
  }, [])

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
      if (result.code === "account_not_activated") {
        setEmail(trimmedEmail)
        setEmailError(null)
        setStep("activate")
        return
      }
      setEmailError(
        asErrorMessage(result.error, "Could not send sign-in email.")
      )
      return
    }

    setEmail(trimmedEmail)
    setOtp("")
    setEmailNoticeOverride(null)
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

      markSessionStarted(window.sessionStorage, Date.now())
      window.location.replace("/auth/continue")
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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <LoginHistoryGuard />
      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-14">
        {step !== "activate" ? (
          <Button
            className="absolute top-6 left-4 text-slate-600 sm:left-8"
            variant="ghost"
            render={<Link href={siteRoutes.home} />}
            nativeButton={false}
          >
            <IconChevronLeft data-icon="inline-start" />
            Back to home
          </Button>
        ) : null}

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center space-y-8 pt-12 lg:pt-0">
          <button
            type="button"
            onClick={handleDisplayLoginSecret}
            className="mr-auto cursor-default border-0 bg-transparent p-0"
            aria-label="CampusCare"
          >
            <CampusCareLogoStatic
              variant="blue"
              alt="CampusCare"
              className="h-9 w-auto"
              width={140}
              priority
            />
          </button>

          <div className="space-y-6">
            {step === "email" ? (
              <AuthEmailStep
                email={email}
                emailError={emailError}
                emailNotice={emailNotice}
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

            {step === "activate" ? <AuthActivateStep /> : null}
          </div>

          {step !== "activate" ? (
            <p className="text-sm text-slate-500">
              By continuing, you agree to our{" "}
              <Link
                className="font-medium text-blue-600 underline-offset-4 hover:underline"
                href={siteRoutes.terms}
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                className="font-medium text-blue-600 underline-offset-4 hover:underline"
                href={siteRoutes.privacy}
              >
                Privacy Policy
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-sky-700 lg:block">
        <LoginClinicPreview />
      </aside>
    </main>
  )
}
