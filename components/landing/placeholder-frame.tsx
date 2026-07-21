import { cn } from "@/lib/utils"

type PlaceholderFrameProps = {
  title: string
  subtitle: string
  className?: string
}

export function PlaceholderFrame({
  title,
  subtitle,
  className,
}: PlaceholderFrameProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-sky-200/90 bg-white/95 p-4 shadow-[0_24px_60px_-28px_rgba(37,99,235,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(14,165,233,0.55)]",
        className
      )}
      role="img"
      aria-label={title}
    >
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <p className="text-xs font-medium text-[#2563EB]">{title}</p>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
        <div className="mt-4 space-y-2">
          <div className="h-8 rounded-xl bg-white shadow-sm ring-1 ring-sky-100" />
          <div className="h-20 rounded-xl bg-gradient-to-r from-sky-100/80 to-blue-100/60 shadow-sm ring-1 ring-sky-100" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 rounded-xl bg-white shadow-sm ring-1 ring-sky-100" />
            <div className="h-16 rounded-xl bg-white shadow-sm ring-1 ring-sky-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
