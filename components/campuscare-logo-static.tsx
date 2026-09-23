import Image from "next/image"

import { cn } from "@/lib/utils"

const LOGO_BLUE = "/images/CampusCareBlue.png"
const LOGO_WHITE = "/images/CampusCareWhite.png"

/** Intrinsic size of CampusCare blue/white PNGs. */
export const CAMPUSCARE_LOGO_INTRINSIC = {
  width: 256,
  height: 135,
} as const

type StaticLogoProps = {
  className?: string
  /** Display width in CSS px; height follows intrinsic ratio. */
  width?: number
  variant?: "blue" | "white"
  alt?: string
  priority?: boolean
}

/**
 * Server-safe CampusCare mark for public surfaces (no theme hook / client JS).
 */
export function CampusCareLogoStatic({
  className,
  width = 48,
  variant = "blue",
  alt = "CampusCare",
  priority = false,
}: StaticLogoProps) {
  const height = Math.round(
    (width * CAMPUSCARE_LOGO_INTRINSIC.height) /
      CAMPUSCARE_LOGO_INTRINSIC.width
  )

  return (
    <Image
      src={variant === "blue" ? LOGO_BLUE : LOGO_WHITE}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      style={{ width: "auto" }}
      className={cn("object-contain", className)}
    />
  )
}
