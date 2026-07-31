import {
  ADMIN_DIRECTORY_ROLES,
  STAFF_DIRECTORY_ROLES,
  type ManagedRole,
} from "@/features/admin/types/user-management"

export type UserDirectory = "admins" | "staff"

export const DIRECTORY_CONFIG = {
  admins: {
    basePath: "/admin/user-management/admins",
    title: "Admins",
    subtitle: "Provision and maintain admin access",
    description:
      "Invite admins for OTP login and keep active access under control.",
    inviteTitle: "Invite admin",
    inviteDescription:
      "Send an OTP invite. They sign in with email — no password to manage.",
    importTitle: "Import admins",
    importDescription: "Upload an Excel roster to invite multiple admins.",
    importCardTitle: "Import admins",
    importRoleHint: "admin",
    templateFilename: "admins-import-template.xlsx",
    templateSampleRows: [
      ["Alex Admin", "alex.admin@example.com", "admin"],
    ] as string[][],
    directoryTitle: "Admin directory",
    roles: ADMIN_DIRECTORY_ROLES,
    defaultCreateRole: "admin" as ManagedRole,
    showRoleFilter: false,
    allowRoleChange: false,
  },
  staff: {
    basePath: "/admin/user-management/staff",
    title: "Clinic staff",
    subtitle: "Provision and maintain clinic access",
    description:
      "Invite nurses, physicians, and dentists. Flip access instantly when coverage changes.",
    inviteTitle: "Invite staff",
    inviteDescription:
      "Name, email, and role. An invite email goes out for OTP sign-in.",
    importTitle: "Import staff",
    importDescription: "Upload an Excel roster to invite clinic staff in bulk.",
    importCardTitle: "Import staff",
    importRoleHint: "nurse | physician | dentist",
    templateFilename: "staff-import-template.xlsx",
    templateSampleRows: [
      ["Nora Nurse", "nora.nurse@example.com", "nurse"],
      ["Pat Physician", "pat.physician@example.com", "physician"],
      ["Dana Dentist", "dana.dentist@example.com", "dentist"],
    ] as string[][],
    directoryTitle: "Clinic Members Directory",
    roles: STAFF_DIRECTORY_ROLES,
    defaultCreateRole: "nurse" as ManagedRole,
    showRoleFilter: true,
    allowRoleChange: true,
  },
} as const

export type DirectoryConfig = (typeof DIRECTORY_CONFIG)[UserDirectory]

export function roleLabel(role: ManagedRole | "all") {
  if (role === "admin") return "Admin"
  if (role === "nurse") return "Nurse"
  if (role === "physician") return "Physician"
  if (role === "dentist") return "Dentist"
  return "All roles"
}
