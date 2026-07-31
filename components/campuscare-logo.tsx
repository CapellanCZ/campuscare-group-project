"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const LOGO_BLUE = "/images/CampusCareBlue.png"
const LOGO_WHITE = "/images/CampusCareWhite.png"

export type CampusCareLogoProps = {
  className?: string
  width?: number
  height?: number
  /** `auto` follows theme; `blue` = light mode asset; `white` = dark mode asset */
  variant?: "auto" | "blue" | "white"
  alt?: string
  priority?: boolean
}

export function CampusCareLogo({
  className,
  width = 40,
  height = 24,
  variant = "auto",
  alt = "CampusCare",
  priority = false,
}: CampusCareLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const src =
    variant === "blue"
      ? LOGO_BLUE
      : variant === "white"
        ? LOGO_WHITE
        : mounted && resolvedTheme === "dark"
          ? LOGO_WHITE
          : LOGO_BLUE

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("object-contain", className)}
    />
  )
}
