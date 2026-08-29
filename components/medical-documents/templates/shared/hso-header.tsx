import Image from "next/image"

import { HSO_DASMA_ADDRESS } from "@/components/medical-documents/templates/shared/hso-half-bond-page"
import { HSO_LOGO_PATH } from "@/features/reports/lib/export-letterhead"
import { cn } from "@/lib/utils"

export function HsoHeader({
  showNfgLogo = false,
  formCode,
  inverted = false,
}: {
  showNfgLogo?: boolean
  formCode?: string
  inverted?: boolean
}) {
  return (
    <header className={cn("text-center", inverted ? "text-white" : "text-black")}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <Image
          src={inverted ? "/documents/nu-logo.png" : HSO_LOGO_PATH}
          alt="NU Dasmariñas Health Services Office"
          width={showNfgLogo ? 180 : 240}
          height={showNfgLogo ? 48 : 64}
          className={cn(
            "object-contain",
            inverted ? "h-12 w-auto brightness-0 invert" : "h-14 w-auto sm:h-16"
          )}
          unoptimized
          priority
        />
        {showNfgLogo ? (
          <Image
            src="/documents/nfg-logo.png"
            alt="Nationalian Friendship Games"
            width={56}
            height={56}
            className={cn(
              "size-12 object-contain sm:size-14",
              inverted && "brightness-0 invert"
            )}
            unoptimized
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mx-auto mt-2 max-w-xl text-[10px] leading-snug sm:text-[11px]",
          inverted ? "text-white/90" : "text-neutral-600"
        )}
      >
        {HSO_DASMA_ADDRESS}
      </p>
      {formCode ? (
        <p
          className={cn(
            "mt-1.5 text-[10px] font-medium tracking-wide",
            inverted ? "text-white/80" : "text-neutral-500"
          )}
        >
          {formCode}
        </p>
      ) : null}
    </header>
  )
}
