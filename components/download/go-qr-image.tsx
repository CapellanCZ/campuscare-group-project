"use client"

import { useState } from "react"

import { FakeQr } from "@/components/landing/fake-qr"
import { buildGoQrImageUrl } from "@/lib/download/goqr"
import { cn } from "@/lib/utils"

type GoQrImageProps = {
  /** Absolute URL encoded into the QR (APK / stable download link). */
  data: string
  alt?: string
  className?: string
}

/**
 * Direct goQR.me PNG — no client QR library, no backend generator.
 * Falls back to a non-scannable placeholder if the image fails to load.
 */
export function GoQrImage({
  data,
  alt = "Scan to download the CampusCare Android app",
  className,
}: GoQrImageProps) {
  const [failed, setFailed] = useState(false)
  const src = buildGoQrImageUrl(data)

  if (failed) {
    return (
      <div className={cn("flex size-full flex-col items-center justify-center gap-2 p-2", className)}>
        <FakeQr label="QR image failed to load" className="size-full opacity-40" />
        <p className="text-center text-[11px] text-slate-500">
          QR unavailable — use Get the app instead
        </p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote goQR.me URL; avoids next/image remote config
    <img
      src={src}
      alt={alt}
      width={300}
      height={300}
      decoding="async"
      className={cn("size-full object-contain", className)}
      onError={() => setFailed(true)}
    />
  )
}
