import {
  IconBell,
  IconChartBar,
  IconClipboardHeart,
  IconFileDescription,
  IconLayoutDashboard,
  IconSpeakerphone,
  IconStack2,
  IconUserHeart,
} from "@tabler/icons-react"

import { LandingLogo } from "@/components/landing/landing-logo"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", icon: IconLayoutDashboard, active: true },
  { label: "Requests", icon: IconClipboardHeart, badge: "3" },
  { label: "Queue", icon: IconStack2 },
  { label: "Patients", icon: IconUserHeart },
  { label: "Consultations", icon: IconFileDescription },
  { label: "Reports", icon: IconChartBar },
  { label: "Announcements", icon: IconSpeakerphone },
] as const

const kpis = [
  { label: "Appointments today", value: "12", delta: "+3" },
  { label: "Waiting patients", value: "5", delta: "Live" },
  { label: "Consultations", value: "8", delta: "+1" },
] as const

const queueRows = [
  { ticket: "A-014", name: "Juan Dela Cruz", station: "Physician", wait: "8m" },
  { ticket: "A-015", name: "Maria Santos", station: "Nurse", wait: "4m" },
  { ticket: "A-016", name: "Ana Reyes", station: "Dentist", wait: "2m" },
] as const

/**
 * Static product mock for landing — CampusCare staff dashboard look,
 * not Untitled UI. Decorative only (no real auth/data, no ⌘K / "/").
 */
export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-blue-500/15 via-transparent to-sky-400/10 blur-2xl sm:-inset-3"
      />
      <div
        aria-hidden
        className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.45)] sm:rounded-3xl"
      >
        <div className="flex h-[min(28rem,58vh)] min-h-[22rem] sm:h-[min(32rem,62vh)]">
          {/* Sidebar */}
          <aside className="hidden w-[9.5rem] shrink-0 flex-col border-r border-slate-100 bg-slate-50/90 p-3 sm:flex md:w-44 md:p-3.5">
            <div className="mb-4 flex items-center gap-2 px-1">
              <LandingLogo alt="" className="h-6 w-auto lg:h-6" />
              <span className="truncate text-xs font-bold tracking-tight text-slate-900">
                CampusCare
              </span>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium md:text-xs",
                      item.active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-500"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="rounded-full bg-blue-600 px-1.5 text-[9px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </nav>
            <div className="mt-auto rounded-xl border border-slate-200/80 bg-white p-2">
              <p className="truncate text-[11px] font-semibold text-slate-900">
                Dr. Dannah
              </p>
              <p className="truncate text-[10px] text-slate-400">Physician</p>
            </div>
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  Welcome back, Dr. Dannah
                </p>
                <p className="truncate text-[10px] text-slate-400 sm:text-xs">
                  Health Services Office · Today
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 sm:inline">
                  On duty
                </span>
                <span className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                  <IconBell className="size-3.5" />
                </span>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-3 sm:space-y-3.5 sm:p-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 sm:p-2.5"
                  >
                    <p className="truncate text-[9px] font-medium tracking-wide text-slate-400 uppercase sm:text-[10px]">
                      {kpi.label}
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-1">
                      <p className="text-base font-bold text-slate-900 sm:text-lg">
                        {kpi.value}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                        {kpi.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Simple chart stand-in */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-800 sm:text-xs">
                    Visits this week
                  </p>
                  <p className="text-[10px] text-slate-400">Clinic flow</p>
                </div>
                <div className="flex h-16 items-end gap-1.5 sm:h-20 sm:gap-2">
                  {[40, 55, 48, 72, 64, 80, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-blue-600 to-sky-400 opacity-90"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-slate-800 sm:text-xs">
                    Station queue
                  </p>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-700">
                    3 waiting
                  </span>
                </div>
                <table className="w-full text-left text-[10px] sm:text-[11px]">
                  <thead className="text-slate-400">
                    <tr className="border-b border-slate-100">
                      <th className="px-2.5 py-1.5 font-medium">Ticket</th>
                      <th className="px-2.5 py-1.5 font-medium">Patient</th>
                      <th className="hidden px-2.5 py-1.5 font-medium sm:table-cell">
                        Station
                      </th>
                      <th className="px-2.5 py-1.5 font-medium">Wait</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {queueRows.map((row) => (
                      <tr
                        key={row.ticket}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="px-2.5 py-1.5 font-semibold text-blue-700">
                          {row.ticket}
                        </td>
                        <td className="truncate px-2.5 py-1.5">{row.name}</td>
                        <td className="hidden px-2.5 py-1.5 sm:table-cell">
                          {row.station}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-500">
                          {row.wait}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
