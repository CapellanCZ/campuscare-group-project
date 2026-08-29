"use client"

import Image from "next/image"

import { cn } from "@/lib/utils"

export function HsoFormLetterhead({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <Image
          src="/images/NU-Logo.png"
          alt="National University"
          width={compact ? 48 : 64}
          height={compact ? 48 : 64}
          className={cn(
            "shrink-0 object-contain",
            compact ? "size-12" : "size-14 sm:size-16"
          )}
        />
        <div className="text-left">
          <h2
            className={cn(
              "font-bold tracking-wide text-neutral-900 uppercase",
              compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
            )}
          >
            NU Dasmariñas
          </h2>
          <p
            className={cn(
              "font-semibold text-neutral-900",
              compact ? "text-sm sm:text-base" : "text-base sm:text-lg"
            )}
          >
            Health Services Office
          </p>
        </div>
      </div>
      <p
        className={cn(
          "mt-1 max-w-xl leading-snug text-neutral-600",
          compact ? "text-xs" : "text-xs sm:text-sm"
        )}
      >
        Sampaloc 1 Bridge, SM Dasmariñas Governor&apos;s Dr., Dasmariñas Cavite,
        Philippines
      </p>
    </div>
  )
}

export function HsoFormShell({
  title,
  formCode,
  formVersion = "ver 2025",
  children,
  footer,
  className,
}: {
  title: string
  formCode?: string
  formVersion?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div
      suppressHydrationWarning
      className={cn(
        "overflow-hidden border border-neutral-400 bg-white font-sans text-neutral-900 shadow-sm",
        className
      )}
    >
      <div className="border-b border-neutral-400 bg-white px-4 py-4 sm:px-6">
        <HsoFormLetterhead />

        <div className="relative mt-4 border-2 border-neutral-900 px-3 py-2 text-center">
          <h3 className="text-lg font-bold tracking-[0.15em] text-neutral-900 uppercase sm:text-xl">
            {title}
          </h3>
          {formCode ? (
            <div className="absolute top-1 right-2 border border-neutral-700 px-1.5 py-0.5 text-[9px] leading-tight text-neutral-700 sm:text-[10px]">
              <div>{formCode}</div>
              <div>{formVersion}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-0 px-4 py-4 sm:px-6">{children}</div>

      {footer ? (
        <div className="border-t border-neutral-300 bg-white px-4 py-4 sm:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
