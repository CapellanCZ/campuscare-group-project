"use client"

import {
  IconBell,
  IconChartBar,
  IconClipboardHeart,
  IconFileDescription,
  IconLayoutDashboard,
  IconLayoutSidebar,
  IconPlayerPause,
  IconPlayerStop,
  IconSpeakerphone,
  IconStack2,
  IconTrash,
  IconUserHeart,
} from "@tabler/icons-react"

import { NurseDashboardView } from "@/components/dashboard/nurse-dashboard-view"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  QueueVitals,
  RecentlyServedItem,
} from "@/lib/health/types"
import { cn } from "@/lib/utils"

const emptyVitals: QueueVitals = {
  bpSystolic: null,
  bpDiastolic: null,
  heartRate: null,
  temperatureC: null,
  spo2: null,
  heightCm: null,
  weightKg: null,
  respiratoryRate: null,
}

const previewAccess: StaffAccess = {
  userId: "landing-preview-nurse",
  email: "nurse@nu-dasma.edu.ph",
  fullName: "Nurse",
  avatarUrl: null,
  primaryRole: "nurse",
  designation: "nurse",
  hasClinicMembership: true,
}

const previewKpis: DashboardKpis = {
  cards: [
    {
      key: "intake",
      label: "Need intake",
      value: "2",
      description: "Waiting for vitals",
    },
    {
      key: "pending",
      label: "Pending requests",
      value: "3",
      description: "Awaiting triage",
    },
    {
      key: "waiting",
      label: "Waiting patients",
      value: "2",
      description: "In line now",
    },
    {
      key: "served",
      label: "Patients served today",
      value: "4",
      description: "Completed tickets",
    },
  ],
}

function demoTicket(
  partial: Pick<
    QueueTicketRow,
    "ticketId" | "ticketCode" | "patientName" | "queuePosition" | "status"
  > &
    Partial<QueueTicketRow>
): QueueTicketRow {
  return {
    appointmentId: null,
    queueNumber: partial.queuePosition,
    estimatedWaitMinutes: 20,
    checkedInAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    patientId: null,
    patientType: "student",
    studentId: "2023-171853",
    campusId: null,
    consultationType: "General consultation",
    service: "General consultation",
    providerQueue: "nurse",
    workflowStatus: "completed",
    assignedPersonnel: "Nurse",
    station: "nurse",
    callCount: 1,
    rejoinCount: 0,
    canRejoin: false,
    intakeCompletedAt: new Date().toISOString(),
    chiefComplaint: "General consultation",
    vitals: emptyVitals,
    intakeNotes: null,
    priority: "normal",
    consultationRequestId: null,
    consultationId: null,
    providerType: "physician",
    ...partial,
  }
}

const previewTickets: QueueTicketRow[] = [
  demoTicket({
    ticketId: "t1",
    ticketCode: "M-003",
    patientName: "Maria Santos Reyes",
    queuePosition: 1,
    status: "waiting",
    studentId: "2024-120441",
    workflowStatus: "checked_in",
    intakeCompletedAt: null,
    chiefComplaint: "Fever and headache",
  }),
  demoTicket({
    ticketId: "t2",
    ticketCode: "M-004",
    patientName: "Juan Miguel Dela Cruz",
    queuePosition: 2,
    status: "waiting",
    studentId: "2023-158902",
    workflowStatus: "checked_in",
    intakeCompletedAt: null,
    chiefComplaint: "Cough and sore throat",
  }),
  demoTicket({
    ticketId: "t3",
    ticketCode: "M-001",
    patientName: "Glenn Francis Anjobhel Domantay Achas",
    queuePosition: 3,
    status: "completed",
    studentId: "2023-171853",
  }),
  demoTicket({
    ticketId: "t4",
    ticketCode: "M-002",
    patientName: "Catherine Zotomayor Capellan",
    queuePosition: 4,
    status: "completed",
    studentId: "2023-172077",
  }),
]

const previewStats: QueueStats = {
  totalWaiting: 2,
  currentlyServing: 0,
  completedToday: 4,
  checkedIn: 4,
  walkIns: 1,
  averageWaitMinutes: 18,
}

const previewActivity: ActivityItem[] = [
  {
    id: "a1",
    title: "Patient checked in",
    description: "M-003 · Maria Santos Reyes",
    statusLabel: "Waiting",
    at: new Date().toISOString(),
  },
  {
    id: "a2",
    title: "Consultation completed",
    description: "M-001 · Glenn Francis Anjobhel Domantay Achas",
    statusLabel: "Completed",
    at: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: "a3",
    title: "Request approved",
    description: "General consultation · Catherine Zotomayor Capellan",
    statusLabel: "Confirmed",
    at: new Date(Date.now() - 28 * 60_000).toISOString(),
  },
]

const previewRecent: RecentlyServedItem[] = []

const previewSummary: RoleDashboardSummary = {
  consultationStats: {
    openToday: 0,
    awaitingAssessment: 0,
    inProgress: 0,
    completedToday: 1,
  },
  certificateStats: {
    issuedThisMonth: 0,
    issuedToday: 0,
    drafts: 0,
    pending: 0,
  },
  patientStats: null,
  staffSummary: null,
  announcements: {
    publishedCount: 0,
    recent: [],
    stats: null,
  },
  requests: {
    pendingCount: 3,
    recent: [
      {
        id: "r1",
        patientName: "Ana Beatrice Villanueva",
        studentId: "2024-101233",
        service: "General consultation",
        preferredDate: "2026-10-13",
        preferredTime: "14:00",
        status: "pending",
        providerType: "physician",
      },
      {
        id: "r2",
        patientName: "Mark Anthony Lopez",
        studentId: "2023-145670",
        service: "Dental check-up",
        preferredDate: "2026-10-13",
        preferredTime: "14:30",
        status: "pending",
        providerType: "dentist",
      },
      {
        id: "r3",
        patientName: "Glenn Francis Anjobhel Domantay Achas",
        studentId: "2023-171853",
        service: "General consultation",
        preferredDate: "2026-10-13",
        preferredTime: "13:40",
        status: "cancelled",
        providerType: "physician",
      },
      {
        id: "r4",
        patientName: "Catherine Zotomayor Capellan",
        studentId: "2023-172077",
        service: "General consultation",
        preferredDate: "2026-10-13",
        preferredTime: "12:20",
        status: "completed",
        providerType: "physician",
      },
    ],
  },
  nurseLanes: {
    needIntake: 2,
    atPhysician: 1,
    atDentist: 0,
    exceptions: 0,
    checkedIn: 4,
    completedIntakes: 2,
  },
  schedule: null,
  physicianWorkspace: null,
  recentConsultations: [],
  dentalReferralsToday: 0,
}

const navGroups = [
  {
    label: "Products",
    items: [
      { label: "Dashboard", icon: IconLayoutDashboard, active: true },
      { label: "Reports", icon: IconChartBar },
      { label: "Announcements", icon: IconSpeakerphone },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Consultation Requests", icon: IconClipboardHeart },
      { label: "Queue Management", icon: IconStack2 },
    ],
  },
  {
    label: "Clinical",
    items: [
      { label: "Patient Records", icon: IconUserHeart },
      { label: "Consultations", icon: IconFileDescription },
      { label: "Medical Documents", icon: IconFileDescription },
    ],
  },
] as const

type NurseDashboardPreviewProps = {
  className?: string
  edge?: boolean
  /** Ignored — kept for call-site compatibility with prior PNG version. */
  priority?: boolean
}

/**
 * Real CampusCare nurse dashboard UI (static dummy data, no live fetch).
 * Decorative product shot — pointer events disabled.
 */
export function NurseDashboardPreview({
  className,
  edge = false,
}: NurseDashboardPreviewProps) {
  return (
    <div
      className={cn(
        "relative min-w-0",
        "w-full",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none relative select-none overflow-hidden border border-slate-200/90 bg-[#f4f6f9] shadow-[0_28px_70px_-32px_rgba(15,23,42,0.45)]",
          edge
            ? "rounded-2xl lg:rounded-l-2xl lg:rounded-r-none lg:border-r-0"
            : "rounded-2xl"
        )}
        aria-hidden
      >
        {/* Staff header — mirrors AppHeader: trigger left, duty/break/alerts/user right */}
        <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-1.5 sm:min-h-12 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center">
            <span className="inline-flex size-7 items-center justify-center rounded-md text-slate-500">
              <IconLayoutSidebar className="size-4" />
            </span>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 sm:inline-flex sm:text-xs">
              Available
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 sm:px-2.5 sm:text-xs">
              <IconPlayerStop className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">End Duty</span>
              <span className="sm:hidden">End</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 sm:px-2.5 sm:text-xs">
              <IconPlayerPause className="size-3.5 shrink-0" />
              Break
            </span>
            <span className="relative flex size-7 items-center justify-center rounded-full border border-slate-200 text-slate-500">
              <IconBell className="size-3.5" />
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white">
                9+
              </span>
            </span>
            <span
              aria-hidden
              className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:block"
            />
            <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
              N
            </span>
          </div>
        </div>

        <div className="flex h-[min(36rem,70vh)] min-h-[28rem] sm:h-[min(40rem,74vh)]">
          <aside className="hidden w-[11.5rem] shrink-0 flex-col border-r border-slate-200/80 bg-white p-3 md:flex lg:w-52">
            <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-1">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = "active" in item && item.active === true
                    return (
                      <div
                        key={item.label}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium lg:text-xs",
                          isActive
                            ? "bg-slate-100 text-blue-700 ring-1 ring-slate-200/80"
                            : "text-slate-600"
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-auto space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 px-2 text-[11px] font-medium text-slate-600">
                <IconTrash className="size-3.5" />
                Bin
              </div>
              <p className="px-2 text-[9px] leading-snug text-slate-400">
                © CampusCare · NU Dasmariñas
              </p>
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden bg-[#f4f6f9] p-3 sm:p-4">
            <div
              className="origin-top-left scale-[0.82] sm:scale-[0.88] md:scale-[0.92]"
              style={{ width: "112%" }}
            >
              <NurseDashboardView
                access={previewAccess}
                kpis={previewKpis}
                tickets={previewTickets}
                activity={previewActivity}
                recent={previewRecent}
                stats={previewStats}
                summary={previewSummary}
                decorative
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
