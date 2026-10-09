import type { ClinicDesignation } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type {
  DashboardKpis,
  QueueStats,
} from "@/lib/health/types"
import type { DashboardPageBundle } from "@/features/dashboard/actions"

const emptyStats: QueueStats = {
  totalWaiting: 0,
  currentlyServing: 0,
  completedToday: 0,
  checkedIn: 0,
  walkIns: 0,
  averageWaitMinutes: 0,
}

const emptySummary: RoleDashboardSummary = {
  consultationStats: {
    openToday: 0,
    awaitingAssessment: 0,
    inProgress: 0,
    completedToday: 0,
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
    pendingCount: 0,
    recent: [],
  },
  nurseLanes: null,
  schedule: null,
  physicianWorkspace: null,
  recentConsultations: [],
  dentalReferralsToday: 0,
}

/** Static KPI chrome shown before Supabase data arrives — labels only, values skeletonized. */
export function placeholderKpis(designation: ClinicDesignation): DashboardKpis {
  if (designation === "nurse") {
    return {
      cards: [
        {
          key: "intake",
          label: "Need intake",
          value: "—",
          description: "Waiting for vitals",
        },
        {
          key: "pending",
          label: "Pending requests",
          value: "—",
          description: "Awaiting triage",
        },
        {
          key: "waiting",
          label: "Waiting patients",
          value: "—",
          description: "In line now",
        },
        {
          key: "served",
          label: "Patients served today",
          value: "—",
          description: "Completed tickets",
        },
      ],
    }
  }

  if (designation === "physician") {
    return {
      cards: [
        {
          key: "appts",
          label: "Appointments today",
          value: "—",
          description: "Confirmed · in progress",
        },
        {
          key: "patients",
          label: "Patients today",
          value: "—",
          description: "Clinic visits",
        },
        {
          key: "waiting",
          label: "Waiting patients",
          value: "—",
          description: "In your queue",
        },
        {
          key: "current",
          label: "Current consultation",
          value: "—",
          description: "Active patient",
        },
      ],
    }
  }

  if (designation === "dentist") {
    return {
      cards: [
        {
          key: "appointments",
          label: "Today's Appointments",
          value: "—",
          description: "Dental visits today",
        },
        {
          key: "waiting",
          label: "Patients Waiting",
          value: "—",
          description: "In your dental queue",
        },
        {
          key: "ongoing",
          label: "Ongoing Consultation",
          value: "—",
          description: "Consultation in progress",
        },
        {
          key: "completed",
          label: "Completed Consultations Today",
          value: "—",
          description: "Finished dental charts",
        },
      ],
    }
  }

  if (designation === "admin") {
    return {
      cards: [
        {
          key: "staff",
          label: "Active staff",
          value: "—",
          description: "Total accounts",
        },
        {
          key: "announcements",
          label: "Published announcements",
          value: "—",
          description: "Active clinic notices",
        },
        {
          key: "completed",
          label: "Visits recorded today",
          value: "—",
          description: "Aggregate consultations",
        },
        {
          key: "certs",
          label: "Certificates issued",
          value: "—",
          description: "Issued today",
        },
      ],
    }
  }

  return {
    cards: [
      {
        key: "waiting",
        label: "Waiting patients",
        value: "—",
        description: "In line now",
      },
      {
        key: "serving",
        label: "Now serving",
        value: "—",
        description: "Active tickets",
      },
      {
        key: "completed",
        label: "Completed today",
        value: "—",
        description: "Finished tickets",
      },
    ],
  }
}

export function emptyDashboardBundle(
  designation: ClinicDesignation
): DashboardPageBundle {
  return {
    kpis: placeholderKpis(designation),
    tickets: [],
    boards: [],
    activity: [],
    recent: [],
    stats: emptyStats,
    summary: emptySummary,
    ops: null,
  }
}
