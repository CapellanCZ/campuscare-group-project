import Image from "next/image"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export const HSO_DASMA_ADDRESS =
  "Sampaloc 1 Bridge, SM Dasmarinas, Government's Dr, Dasmarinas Cavite, Philippines"

/** Official half-bond HSO form — 8.5in × 5.5in. */
export const HSO_HALF_BOND_CLASS =
  "box-border w-[8.5in] max-w-full print:w-[8.5in]"

export function HsoHalfBondPage({
  formCode,
  formVersion = "2025",
  className,
  children,
  footer,
}: {
  formCode: string
  formVersion?: string
  className?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <article
      className={cn(
        "hso-half-bond-page relative mx-auto flex min-h-[5.5in] flex-col bg-white px-10 py-5",
        "font-[Times_New_Roman,Times,serif] text-[11pt] leading-[1.35] text-black",
        "print:box-border print:h-[5.5in] print:max-h-[5.5in] print:min-h-0",
        "print:justify-between print:overflow-hidden print:px-8 print:py-[0.12in]",
        "print:text-[10pt] print:leading-[1.2]",
        HSO_HALF_BOND_CLASS,
        className
      )}
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      <div className="absolute top-4 right-8 text-right text-[9.5pt] leading-none print:top-[0.12in] print:right-[0.35in] print:text-[8.5pt]">
        <p className="font-bold">{formCode}</p>
        <p className="mt-0.5">ver {formVersion}</p>
      </div>

      <header className="mb-3 flex flex-col items-center text-center print:mb-1">
        <Image
          src="/documents/hso-logo.png"
          alt="NU Dasmariñas Health Service Office"
          width={300}
          height={64}
          className="h-[58px] w-auto max-w-[300px] object-contain print:h-[0.48in] print:max-w-[2.6in] print:[print-color-adjust:exact]"
          unoptimized
          priority
        />
        <p className="mt-1.5 max-w-[95%] text-[10pt] leading-snug print:mt-0.5 print:text-[8.5pt] print:leading-tight">
          {HSO_DASMA_ADDRESS}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col print:flex-none print:gap-0">{children}</div>

      {footer ? (
        <footer className="mt-auto shrink-0 pt-7 print:mt-0 print:pt-1">{footer}</footer>
      ) : null}
    </article>
  )
}

/** Scales half-bond forms to fit preview dialogs while keeping paper proportions. */
export function HsoFormPreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="hso-form-preview-frame mx-auto w-full max-w-[816px]">
      <div className="overflow-x-auto rounded-sm bg-white shadow-md ring-1 ring-black/10">
        <div className="mx-auto w-[8.5in] min-w-[min(100%,320px)] max-w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
