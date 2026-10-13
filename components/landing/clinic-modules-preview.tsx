import { features } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

type ClinicModulesPreviewProps = {
  className?: string
  /** How many modules to show in the card (default 3). */
  limit?: number
}

/**
 * Product preview card for the landing page — real CampusCare module copy,
 * not a stock Untitled UI / dashboard screenshot (no fake "/" search shortcut).
 */
export function ClinicModulesPreview({
  className,
  limit = 3,
}: ClinicModulesPreviewProps) {
  const items = features.slice(0, limit)

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-500/10 via-transparent to-sky-400/10 blur-2xl sm:-inset-4"
      />
      <div className="relative rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_24px_60px_-28px_rgba(37,99,235,0.35)] sm:rounded-3xl sm:p-6 md:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-blue-600 uppercase sm:text-xs">
            <span
              className="size-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
            Clinic modules connected
          </p>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 sm:px-3 sm:text-sm">
            {features.length} modules
          </span>
        </div>
        <ul className="space-y-3 sm:space-y-4">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.title}
                className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:size-12 sm:rounded-2xl">
                  <Icon className="size-5 sm:size-6" aria-hidden />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-base font-semibold text-slate-900 sm:text-lg">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-pretty text-sm text-slate-500 sm:text-base">
                    {item.description}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
