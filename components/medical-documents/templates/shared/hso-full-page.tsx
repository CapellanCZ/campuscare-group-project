import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Shared typography and spacing for full-page HSO letter documents. */
export const HSO_FULL_PAGE_CLASS =
  "mx-auto bg-white px-8 py-7 font-serif text-[11px] leading-relaxed text-black sm:px-10 sm:py-8"

export function HsoFullPageDocument({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article className={cn(HSO_FULL_PAGE_CLASS, "max-w-[780px]", className)}>
      {children}
    </article>
  )
}

export function HsoFullPageTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h1
      className={cn(
        "mt-5 border-b border-neutral-300 pb-3 text-center text-base font-bold tracking-wide uppercase",
        className
      )}
    >
      {children}
    </h1>
  )
}

export function HsoFullPageSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("mt-4 rounded border border-neutral-300", className)}>
      <h2 className="rounded-t bg-neutral-100 px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase">
        {title}
      </h2>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  )
}

export function HsoFormCheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span
      className="inline-flex size-3 shrink-0 items-center justify-center border border-black"
      aria-hidden
    >
      {checked ? <span className="block size-2 bg-black" /> : null}
    </span>
  )
}

/** Scales full-page HSO documents in preview dialogs. */
export function HsoFullPagePreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[820px]">
      <div className="overflow-x-auto rounded-sm bg-white shadow-md ring-1 ring-black/10">
        {children}
      </div>
    </div>
  )
}
