import {
  IconDental,
  IconHeartbeat,
  IconStethoscope,
  IconUsers,
  IconVolume,
} from "@tabler/icons-react"

import type { LoginPreviewSlideId } from "@/lib/auth/login-preview-slides"
import { cn } from "@/lib/utils"

/** Decorative demo body inside each login carousel card — no live data. */
export function LoginPreviewSlideBody({
  slideId,
}: {
  slideId: LoginPreviewSlideId
}) {
  switch (slideId) {
    case "dashboard":
      return (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold text-slate-800">
            Recent consultations
          </p>
          <div className="mt-2.5 space-y-2" aria-hidden>
            <div className="h-2.5 w-full rounded-full bg-slate-200/90" />
            <div className="h-2.5 w-[82%] rounded-full bg-slate-200/90" />
            <div className="h-2.5 w-[64%] rounded-full bg-slate-200/90" />
          </div>
        </div>
      )

    case "reports":
      return (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold text-slate-800">
            Weekly visit volume
          </p>
          <div
            className="mt-3 flex h-16 items-end justify-between gap-1 px-0.5"
            aria-hidden
          >
            {[42, 68, 50, 82, 58, 74, 46].map((height, index) => (
              <span
                key={index}
                className="w-full rounded-t-md bg-blue-500/75"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Sample chart only</p>
        </div>
      )

    case "announcements":
      return (
        <ul className="space-y-1.5">
          {[
            { title: "Clinic advisory", tag: "Published" },
            { title: "Wellness reminder", tag: "Scheduled" },
            { title: "Hours notice", tag: "Draft" },
          ].map((item) => (
            <li
              key={item.title}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2"
            >
              <span className="truncate text-xs font-medium text-slate-800">
                {item.title}
              </span>
              <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                {item.tag}
              </span>
            </li>
          ))}
        </ul>
      )

    case "queue":
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2">
            <p className="text-xs font-semibold text-slate-800">Waiting lane</p>
            <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
              + Walk-in
            </span>
          </div>
          <ul className="divide-y divide-slate-100 text-xs">
            {[
              { ticket: "N-12", status: "waiting", tone: "bg-amber-50 text-amber-700" },
              { ticket: "P-04", status: "serving", tone: "bg-blue-50 text-blue-700" },
              { ticket: "D-02", status: "waiting", tone: "bg-amber-50 text-amber-700" },
            ].map((row) => (
              <li
                key={row.ticket}
                className="flex items-center justify-between gap-2 px-2.5 py-2"
              >
                <span className="font-medium tabular-nums text-slate-800">
                  {row.ticket}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    row.tone
                  )}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )

    case "display":
      return <QueueDisplayDemoPreview />
  }
}

function QueueDisplayDemoPreview() {
  const stations = [
    {
      key: "nurse",
      label: "Nurse",
      accent: "text-rose-600",
      soft: "bg-rose-500/10",
      serving: "bg-rose-500/10",
      dash: "bg-rose-500",
      icon: IconHeartbeat,
      wait: "0 waiting · ~8 min wait",
    },
    {
      key: "physician",
      label: "Physician",
      accent: "text-emerald-600",
      soft: "bg-emerald-500/10",
      serving: "bg-emerald-500/10",
      dash: "bg-emerald-500",
      icon: IconStethoscope,
      wait: "0 waiting · ~10 min wait",
    },
    {
      key: "dentist",
      label: "Dentist",
      accent: "text-blue-600",
      soft: "bg-blue-500/10",
      serving: "bg-blue-500/10",
      dash: "bg-blue-500",
      icon: IconDental,
      wait: "0 waiting · ~10 min wait",
    },
  ] as const

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-2.5 py-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium tracking-wide text-slate-400 uppercase">
            Health Services Office
          </p>
          <p className="truncate text-xs font-bold tracking-tight text-slate-900">
            Patients Queue Display
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
            <IconVolume className="size-3" aria-hidden />
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1">
            <IconUsers className="size-3 text-blue-600" aria-hidden />
            <span className="leading-none">
              <span className="block text-[7px] font-semibold tracking-wide text-slate-400 uppercase">
                Waiting
              </span>
              <span className="block text-sm font-bold tabular-nums text-slate-900">
                0
              </span>
            </span>
          </span>
          <span className="hidden text-right sm:block">
            <span className="block text-xs font-bold tabular-nums text-slate-900">
              20:08:42
            </span>
            <span className="block text-[8px] text-slate-400">
              Sat, Oct 10
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-2">
        {stations.map((station) => {
          const Icon = station.icon
          return (
            <div
              key={station.key}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="space-y-1 border-b border-slate-100 px-1.5 py-1.5">
                <div className="flex items-center justify-between gap-0.5">
                  <span className="flex items-center gap-0.5 text-[8px] font-semibold tracking-wide text-slate-400 uppercase">
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-md",
                        station.soft,
                        station.accent
                      )}
                    >
                      <Icon className="size-2.5" aria-hidden />
                    </span>
                    Station
                  </span>
                  <span className="rounded-full border border-slate-200 px-1 py-px text-[7px] text-slate-500">
                    Not Available
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[11px] font-bold tracking-tight uppercase",
                    station.accent
                  )}
                >
                  {station.label}
                </p>
                <p className="text-[8px] leading-tight text-slate-500">
                  Status: Not Available
                </p>
                <p className="text-[8px] leading-tight text-slate-400">
                  {station.wait}
                </p>
              </div>
              <div className={cn("mx-1.5 mt-1.5 rounded-md px-1 py-1.5", station.serving)}>
                <p className="text-[7px] font-semibold tracking-wide text-slate-500 uppercase">
                  Now serving
                </p>
                <div
                  className={cn("mx-auto my-1 h-0.5 w-6 rounded-full", station.dash)}
                  aria-hidden
                />
                <p className="text-center text-[8px] text-slate-500">
                  No active patient
                </p>
              </div>
              <div className="px-1.5 py-1.5">
                <p className="text-[7px] font-semibold tracking-wide text-slate-400 uppercase">
                  Upcoming
                </p>
                <p className="text-[8px] text-slate-400">
                  No other tickets in line.
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
