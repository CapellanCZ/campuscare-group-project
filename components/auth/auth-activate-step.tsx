"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

function MailboxIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <ellipse cx="100" cy="128" rx="48" ry="6" fill="currentColor" opacity="0.08" />
      <path
        d="M42 78c0-22 18-40 40-40h36c22 0 40 18 40 40v28H42V78Z"
        fill="#22c55e"
      />
      <path
        d="M42 78c0-22 18-40 40-40h8v68H42V78Z"
        fill="#16a34a"
      />
      <rect x="54" y="70" width="18" height="14" rx="2" fill="#fef08a" />
      <path
        d="M118 52h36c6 0 10 4 10 10v8H108v-8c0-6 4-10 10-10Z"
        fill="#f8fafc"
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <path
        d="M108 70h56v6c0 6-4 10-10 10h-36c-6 0-10-4-10-10v-6Z"
        fill="#e2e8f0"
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <path d="M136 36l4 10 10 2-8 6 3 10-9-6-9 6 3-10-8-6 10-2 4-10Z" fill="#f97316" />
      <circle cx="64" cy="48" r="10" fill="currentColor" opacity="0.06" />
      <circle cx="150" cy="42" r="14" fill="currentColor" opacity="0.05" />
    </svg>
  )
}

export function AuthActivateStep() {
  return (
    <div className="flex flex-col items-center space-y-6 text-center">
      <MailboxIllustration className="h-36 w-full max-w-[220px] text-foreground" />

      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-wide">Activate your account</h1>
        <p className="text-base text-muted-foreground">
          We sent you a confirmation link. Click on it to verify your account,
          then return here to sign in with a one-time pin.
        </p>
      </div>

      <Button
        variant="outline"
        className="min-w-40 rounded-full"
        render={<Link href="/login" />}
        nativeButton={false}
      >
        Go back home
      </Button>
    </div>
  )
}
