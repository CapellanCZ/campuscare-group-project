"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const LOGO_BLUE = "/images/CampusCareBlue.png"
const LOGO_WHITE = "/images/CampusCareWhite.png"

/** Intrinsic pixel size of CampusCareBlue/White assets (256×135). */
export const CAMPUSCARE_LOGO_INTRINSIC = {
  width: 256,
  height: 135,
} as const

export type CampusCareLogoProps = {
  className?: string
  /** Display width in CSS px; height derived from intrinsic ratio. */
  width?: number
  height?: number
  /** `auto` follows theme; `blue` = light mode asset; `white` = dark mode asset */
  variant?: "auto" | "blue" | "white"
  alt?: string
  priority?: boolean
}

function resolveDimensions(width?: number, height?: number) {
  if (width != null && height != null) {
    // Prefer width; derive height from intrinsic ratio to avoid distortion.
    const derivedHeight = Math.round(
      (width * CAMPUSCARE_LOGO_INTRINSIC.height) /
        CAMPUSCARE_LOGO_INTRINSIC.width
    )
    return { width, height: derivedHeight }
  }
  if (width != null) {
    return {
      width,
      height: Math.round(
        (width * CAMPUSCARE_LOGO_INTRINSIC.height) /
          CAMPUSCARE_LOGO_INTRINSIC.width
      ),
    }
  }
  if (height != null) {
    return {
      width: Math.round(
        (height * CAMPUSCARE_LOGO_INTRINSIC.width) /
          CAMPUSCARE_LOGO_INTRINSIC.height
      ),
      height,
    }
  }
  return {
    width: 40,
    height: Math.round(
      (40 * CAMPUSCARE_LOGO_INTRINSIC.height) / CAMPUSCARE_LOGO_INTRINSIC.width
    ),
  }
}

function LogoImage({
  src,
  alt,
  width,
  height,
  priority,
  className,
}: {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      // CSS sets height (e.g. h-8); width:auto preserves aspect ratio.
      style={{ width: "auto" }}
      className={cn("object-contain", className)}
    />
  )
}

function ThemedCampusCareLogo({
  className,
  width,
  height,
  alt,
  priority,
}: Omit<CampusCareLogoProps, "variant"> & {
  width: number
  height: number
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const src =
    mounted && resolvedTheme === "dark" ? LOGO_WHITE : LOGO_BLUE

  return (
    <LogoImage
      src={src}
      alt={alt ?? "CampusCare"}
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  )
}

export function CampusCareLogo({
  className,
  width,
  height,
  variant = "auto",
  alt = "CampusCare",
  priority = false,
}: CampusCareLogoProps) {
  const dims = resolveDimensions(width, height)

  if (variant === "blue" || variant === "white") {
    return (
      <LogoImage
        src={variant === "blue" ? LOGO_BLUE : LOGO_WHITE}
        alt={alt}
        width={dims.width}
        height={dims.height}
        priority={priority}
        className={className}
      />
    )
  }

  return (
    <ThemedCampusCareLogo
      className={className}
      width={dims.width}
      height={dims.height}
      alt={alt}
      priority={priority}
    />
  )
}
