import Image from "next/image"

import { cn } from "@/lib/utils"

/** Intrinsic size of cropped `public/images/logo.png`. */
const LOGO = {
  width: 662,
  height: 347,
} as const

type LandingLogoProps = {
  className?: string
  alt?: string
  priority?: boolean
  /** Force a white mark (e.g. on blue panels). */
  tone?: "default" | "white"
}

/**
 * Landing mark — height-driven so it scales cleanly across breakpoints.
 * Served as the original PNG (`unoptimized`) so AVIF/WebP compression
 * does not soft-blur flat vector-style artwork.
 */
export function LandingLogo({
  className,
  alt = "CampusCare",
  priority = false,
  tone = "default",
}: LandingLogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt={alt}
      width={LOGO.width}
      height={LOGO.height}
      priority={priority}
      unoptimized
      sizes="(max-width: 640px) 96px, 128px"
      className={cn(
        "block h-8 w-auto shrink-0 object-contain object-center sm:h-9 lg:h-10",
        tone === "white" && "brightness-0 invert",
        className
      )}
    />
  )
}
