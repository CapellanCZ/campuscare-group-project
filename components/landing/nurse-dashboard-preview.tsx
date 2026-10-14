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

const DEMO_NURSE_NAME = "Nurse"
const DEMO_NURSE_AVATAR = "/images/demo-nurse.jpg"

/** Fixed ISO times — never `new Date()` at module scope (avoids SSR/client hydration drift). */
const DEMO_NOW = "2026-10-14T01:00:00.000Z"
const DEMO_12M_AGO = "2026-10-14T00:48:00.000Z"
const DEMO_28M_AGO = "2026-10-14T00:32:00.000Z"

const previewAccess: StaffAccess = {
  userId: "landing-preview-nurse",
  email: "nurse@nu-dasma.edu.ph",
  fullName: DEMO_NURSE_NAME,
  avatarUrl: DEMO_NURSE_AVATAR,
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
    checkedInAt: DEMO_NOW,
    updatedAt: DEMO_NOW,
    createdAt: DEMO_NOW,
    patientId: null,
    patientType: "student",
    studentId: "2023-171853",
    campusId: null,
    consultationType: "General consultation",
    service: "General consultation",
    providerQueue: "nurse",
    workflowStatus: "completed",
    assignedPersonnel: DEMO_NURSE_NAME,
    station: "nurse",
    callCount: 1,
    rejoinCount: 0,
    canRejoin: false,
    intakeCompletedAt: DEMO_NOW,
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
    patientName: "Alex Rivera",
    queuePosition: 1,
    status: "waiting",
    studentId: "2024-100001",
    workflowStatus: "checked_in",
    intakeCompletedAt: null,
    chiefComplaint: "Fever and headache",
  }),
  demoTicket({
    ticketId: "t2",
    ticketCode: "M-004",
    patientName: "Jamie Santos",
    queuePosition: 2,
    status: "waiting",
    studentId: "2024-100002",
    workflowStatus: "checked_in",
    intakeCompletedAt: null,
    chiefComplaint: "Cough and sore throat",
  }),
  demoTicket({
    ticketId: "t3",
    ticketCode: "M-001",
    patientName: "Casey Mendoza",
    queuePosition: 3,
    status: "completed",
    studentId: "2024-100003",
  }),
  demoTicket({
    ticketId: "t4",
    ticketCode: "M-002",
    patientName: "Taylor Cruz",
    queuePosition: 4,
    status: "completed",
    studentId: "2024-100004",
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
    description: "M-003 · Alex Rivera",
    statusLabel: "Waiting",
    at: DEMO_NOW,
  },
  {
    id: "a2",
    title: "Consultation completed",
    description: "M-001 · Casey Mendoza",
    statusLabel: "Completed",
    at: DEMO_12M_AGO,
  },
  {
    id: "a3",
    title: "Request approved",
    description: "General consultation · Taylor Cruz",
    statusLabel: "Confirmed",
    at: DEMO_28M_AGO,
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
        patientName: "Sam Villanueva",
        studentId: "2024-100011",
        service: "General consultation",
        preferredDate: "2026-10-13",
        preferredTime: "14:00",
        status: "pending",
        providerType: "physician",
      },
      {
        id: "r2",
        patientName: "Riley Lopez",
        studentId: "2024-100012",
        service: "Dental check-up",
        preferredDate: "2026-10-13",
        preferredTime: "14:30",
        status: "pending",
        providerType: "dentist",
      },
      {
        id: "r3",
        patientName: "Casey Mendoza",
        studentId: "2024-100003",
        service: "General consultation",
        preferredDate: "2026-10-13",
        preferredTime: "13:40",
        status: "cancelled",
        providerType: "physician",
      },
      {
        id: "r4",
        patientName: "Taylor Cruz",
        studentId: "2024-100004",
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

/** Design canvas for a complete nurse dashboard page (then scaled down). */
const PAGE_W = 1180
const PAGE_H = 860
/** Preview scale — readable full-page shot on the right, not a tiny thumbnail. */
const PAGE_SCALE = 0.72

type NurseDashboardPreviewProps = {
  className?: string
  /** Kept for call-site compatibility — preview is always a floating window. */
  edge?: boolean
  /** Ignored — kept for call-site compatibility with prior PNG version. */
  priority?: boolean
}

/**
 * Real CampusCare nurse dashboard as a scaled full-page preview
 * (complete layout, not cropped) — decorative, no live fetch.
 */
export function NurseDashboardPreview({
  className,
}: NurseDashboardPreviewProps) {
  return (
    <div
      className={cn("relative mx-auto min-w-0 w-full max-w-[54rem]", className)}
      style={{
        maxWidth: PAGE_W * PAGE_SCALE,
        height: PAGE_H * PAGE_SCALE,
      }}
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left select-none overflow-hidden rounded-2xl border border-slate-200/90 bg-[#f4f6f9] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.4),0_12px_28px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5"
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${PAGE_SCALE})`,
        }}
        aria-hidden
      >
        {/* Staff header — mirrors AppHeader */}
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-4">
          <div className="flex min-w-0 flex-1 items-center">
            <span className="inline-flex size-7 items-center justify-center rounded-md text-slate-500">
              <IconLayoutSidebar className="size-4" />
            </span>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              Available
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
              <IconPlayerStop className="size-3.5 shrink-0" />
              End Duty
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
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
              className="mx-0.5 h-4 w-px bg-slate-200"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative static preview */}
            <img
              src={DEMO_NURSE_AVATAR}
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full object-cover ring-1 ring-slate-200"
            />
          </div>
        </div>

        <div className="flex h-[calc(100%-3rem)] min-h-0">
          <aside className="flex w-52 shrink-0 flex-col border-r border-slate-200/80 bg-white p-3">
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
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium",
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
            <div className="mt-auto border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 px-2 text-[11px] font-medium text-slate-600">
                <IconTrash className="size-3.5" />
                Bin
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden bg-[#f4f6f9] p-4">
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
  )
}
