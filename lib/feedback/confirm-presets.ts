export type ConfirmPresetKey =
  | "approve"
  | "decline"
  | "reschedule"
  | "cancelRequest"
  | "cancelConsultation"
  | "startConsultation"
  | "completeConsultation"
  | "skipPatient"
  | "removeFromQueue"
  | "delete"
  | "publish"
  | "unpublish"
  | "archive"
  | "generateCertificate"
  | "finalizeDocument"
  | "createStaff"
  | "enableStaff"
  | "disableStaff"
  | "deleteStaff"
  | "saveSettings"
  | "startDuty"
  | "endDuty"
  | "resumeWork"
  | "goOnBreak"
  | "logout"

export type ConfirmPreset = {
  variant: "default" | "destructive" | "warning"
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
}

export const CONFIRM_PRESETS: Record<ConfirmPresetKey, ConfirmPreset> = {
  approve: {
    variant: "default",
    title: "Approve Consultation?",
    description:
      "Are you sure you want to approve this consultation request?",
    confirmLabel: "Approve",
  },
  decline: {
    variant: "destructive",
    title: "Decline Consultation Request?",
    description:
      "Are you sure you want to decline this consultation request?",
    confirmLabel: "Decline",
  },
  reschedule: {
    variant: "default",
    title: "Reschedule Consultation?",
    description: "Are you sure you want to reschedule this consultation?",
    confirmLabel: "Confirm Reschedule",
  },
  cancelRequest: {
    variant: "destructive",
    title: "Cancel Consultation Request?",
    description: "Are you sure you want to cancel this consultation request?",
    confirmLabel: "Cancel Request",
    cancelLabel: "Keep Request",
  },
  cancelConsultation: {
    variant: "destructive",
    title: "Cancel Consultation?",
    description: "Are you sure you want to cancel this consultation?",
    confirmLabel: "Cancel Consultation",
    cancelLabel: "Keep Consultation",
  },
  startConsultation: {
    variant: "default",
    title: "Start Consultation?",
    description: "Are you sure you want to start this consultation?",
    confirmLabel: "Start Consultation",
  },
  completeConsultation: {
    variant: "default",
    title: "Complete consultation?",
    description:
      "Review your notes before finishing. Confirm to mark this consultation as completed and save the summary to the patient record.",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
  },
  skipPatient: {
    variant: "default",
    title: "Skip Patient?",
    description:
      "Are you sure you want to skip this patient in the queue?",
    confirmLabel: "Skip Patient",
  },
  removeFromQueue: {
    variant: "destructive",
    title: "Remove Patient from Queue?",
    description:
      "Are you sure you want to remove this patient from the queue?",
    confirmLabel: "Remove Patient",
  },
  delete: {
    variant: "destructive",
    title: "Delete Record?",
    description:
      "Are you sure you want to delete this record? This action may not be reversible.",
    confirmLabel: "Delete",
  },
  publish: {
    variant: "default",
    title: "Publish Announcement?",
    description: "Are you sure you want to publish this announcement?",
    confirmLabel: "Publish",
  },
  unpublish: {
    variant: "default",
    title: "Unpublish Announcement?",
    description: "Are you sure you want to unpublish this announcement?",
    confirmLabel: "Unpublish",
  },
  archive: {
    variant: "default",
    title: "Archive Announcement?",
    description: "Are you sure you want to archive this announcement?",
    confirmLabel: "Archive",
  },
  generateCertificate: {
    variant: "default",
    title: "Generate Medical Certificate?",
    description:
      "Are you sure you want to generate this medical certificate?",
    confirmLabel: "Generate Certificate",
  },
  finalizeDocument: {
    variant: "default",
    title: "Finalize Medical Document?",
    description:
      "Are you sure you want to finalize this document? Changes may be limited afterward.",
    confirmLabel: "Finalize Document",
  },
  createStaff: {
    variant: "default",
    title: "Create Staff Account?",
    description: "Are you sure you want to create this staff account?",
    confirmLabel: "Create Account",
  },
  enableStaff: {
    variant: "default",
    title: "Enable Staff Account?",
    description: "Are you sure you want to enable this staff account?",
    confirmLabel: "Enable Account",
  },
  disableStaff: {
    variant: "destructive",
    title: "Disable Staff Account?",
    description: "Are you sure you want to disable this staff account?",
    confirmLabel: "Disable Account",
  },
  deleteStaff: {
    variant: "destructive",
    title: "Delete Staff Account?",
    description:
      "Are you sure you want to delete this staff account? This action may not be reversible.",
    confirmLabel: "Delete Account",
  },
  saveSettings: {
    variant: "default",
    title: "Save Clinic Settings?",
    description: "Are you sure you want to apply these changes?",
    confirmLabel: "Save Changes",
  },
  startDuty: {
    variant: "default",
    title: "Start Duty?",
    description: "Are you sure you want to start your duty?",
    confirmLabel: "Start Duty",
  },
  endDuty: {
    variant: "default",
    title: "End Duty?",
    description: "Are you sure you want to end your duty?",
    confirmLabel: "End Duty",
  },
  resumeWork: {
    variant: "default",
    title: "Resume Work?",
    description: "Are you sure you want to resume work and end your break?",
    confirmLabel: "Resume Work",
  },
  goOnBreak: {
    variant: "default",
    title: "Go on Break?",
    description:
      "Are you sure you want to go on break? Clinic actions will be paused until you resume work.",
    confirmLabel: "Go on Break",
  },
  logout: {
    variant: "default",
    title: "Log Out?",
    description: "Are you sure you want to log out of CampusCare?",
    confirmLabel: "Log Out",
  },
}
