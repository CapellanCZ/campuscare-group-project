"use client"

import Image from "next/image"

import { HSO_LOGO_PATH } from "@/features/reports/lib/export-letterhead"
import { cn } from "@/lib/utils"

export function HsoFormLetterhead({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src={HSO_LOGO_PATH}
        alt="NU Dasmariñas Health Services Office"
        width={compact ? 180 : 240}
        height={compact ? 48 : 64}
        className={cn(
          "shrink-0 object-contain",
          compact ? "h-12 w-auto" : "h-14 w-auto sm:h-16"
        )}
        priority
      />
      <p
        className={cn(
          "mt-2 max-w-xl leading-snug text-neutral-600",
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
