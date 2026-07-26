import type { WebRole } from "@/lib/auth/types"

export type RoleMeta = {
  title: string
  subtitle: string
  description: string
}

const roleMetaMap: Record<WebRole, RoleMeta> = {
  admin: {
    title: "Admin Dashboard",
    subtitle: "System-wide monitoring and management",
    description:
      "Track operations, manage users, and oversee reports and announcements across the clinic.",
  },
  nurse: {
    title: "Nurse Dashboard",
    subtitle: "Queue and initial assessment operations",
    description:
      "Handle consultation intake, queue updates, vital signs, and initial assessment workflows.",
  },
  physician: {
    title: "Physician Dashboard",
    subtitle: "Consultation and treatment workspace",
    description:
      "Manage appointments, consultations, diagnosis notes, prescriptions, and availability.",
  },
  dentist: {
    title: "Dentist Dashboard",
    subtitle: "Dental consultation management",
    description:
      "Handle dental consultations, findings, procedures, and dental medical certificates.",
  },
  queue_display: {
    title: "Queue Display",
    subtitle: "Public waiting-room board",
    description: "Live queue board for clinic waiting areas.",
  },
}

export function getRoleMeta(role: WebRole): RoleMeta {
  return roleMetaMap[role]
}
