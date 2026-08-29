import { appToast } from "@/lib/feedback/app-toast"

const FAILED_DESCRIPTION =
  "The operation could not be completed. Please try again."

export const requestToasts = {
  approved: () =>
    appToast.success({
      title: "Request Approved",
      description: "The consultation request has been approved.",
    }),
  declined: () =>
    appToast.success({
      title: "Request Declined",
      description: "The consultation request has been declined.",
    }),
  rescheduled: () =>
    appToast.success({
      title: "Request Rescheduled",
      description: "The consultation request has been rescheduled.",
    }),
  cancelled: () =>
    appToast.success({
      title: "Request Cancelled",
      description: "The consultation request has been cancelled.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const consultationToasts = {
  started: () =>
    appToast.success({
      title: "Consultation Started",
      description: "The consultation is now in progress.",
    }),
  saved: () =>
    appToast.success({
      title: "Consultation Saved",
      description: "Consultation details have been saved.",
    }),
  completed: () =>
    appToast.success({
      title: "Consultation Completed",
      description: "The consultation has been marked as completed.",
    }),
  cancelled: () =>
    appToast.success({
      title: "Consultation Cancelled",
      description: "The consultation has been cancelled.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const queueToasts = {
  called: () =>
    appToast.success({
      title: "Patient Called",
      description: "The patient has been notified.",
    }),
  skipped: () =>
    appToast.success({
      title: "Patient Skipped",
      description: "The patient has been skipped in the queue.",
    }),
  recalled: () =>
    appToast.success({
      title: "Patient Recalled",
      description: "The patient has been recalled to the queue.",
    }),
  removed: () =>
    appToast.success({
      title: "Patient Removed",
      description: "The patient has been removed from the queue.",
    }),
  updated: () =>
    appToast.success({
      title: "Queue Updated",
      description: "The queue has been updated.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const patientToasts = {
  saved: () =>
    appToast.success({
      title: "Patient Record Saved",
      description: "Patient information has been updated.",
    }),
  vitalsRecorded: () =>
    appToast.success({
      title: "Vital Signs Recorded",
      description: "Patient vital signs have been saved.",
    }),
  deleted: () =>
    appToast.success({
      title: "Patient Record Deleted",
      description: "The patient record has been removed.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const documentToasts = {
  certificateGenerated: () =>
    appToast.success({
      title: "Medical Certificate Generated",
      description: "The medical certificate has been generated.",
    }),
  finalized: () =>
    appToast.success({
      title: "Document Finalized",
      description: "The medical document has been finalized.",
    }),
  saved: () =>
    appToast.success({
      title: "Document Saved",
      description: "The medical document has been saved.",
    }),
  deleted: () =>
    appToast.success({
      title: "Document Deleted",
      description: "The medical document has been removed.",
    }),
  voided: () =>
    appToast.success({
      title: "Document Voided",
      description: "The medical document has been marked void.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const announcementToasts = {
  published: () =>
    appToast.success({
      title: "Announcement Published",
      description: "The announcement is now live.",
    }),
  updated: () =>
    appToast.success({
      title: "Announcement Updated",
      description: "The announcement has been updated.",
    }),
  unpublished: () =>
    appToast.success({
      title: "Announcement Unpublished",
      description: "The announcement is no longer published.",
    }),
  archived: () =>
    appToast.success({
      title: "Announcement Archived",
      description: "The announcement has been archived.",
    }),
  deleted: () =>
    appToast.success({
      title: "Announcement Deleted",
      description: "The announcement has been removed.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const staffToasts = {
  created: () =>
    appToast.success({
      title: "Staff Account Created",
      description: "The staff account has been created.",
    }),
  updated: () =>
    appToast.success({
      title: "Staff Account Updated",
      description: "Staff account details have been saved.",
    }),
  enabled: () =>
    appToast.success({
      title: "Staff Account Enabled",
      description: "The staff account is now active.",
    }),
  disabled: () =>
    appToast.success({
      title: "Staff Account Disabled",
      description: "The staff account has been disabled.",
    }),
  deleted: () =>
    appToast.success({
      title: "Staff Account Deleted",
      description: "The staff account has been removed.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const settingsToasts = {
  updated: () =>
    appToast.success({
      title: "Settings Updated",
      description: "Clinic settings have been saved.",
    }),
  slotsUpdated: () =>
    appToast.success({
      title: "Consultation Slots Updated",
      description: "Daily consultation slots have been updated.",
    }),
  scheduleUpdated: () =>
    appToast.success({
      title: "Clinic Schedule Updated",
      description: "The clinic schedule has been saved.",
    }),
  staffScheduleUpdated: () =>
    appToast.success({
      title: "Staff Schedule Updated",
      description: "The staff schedule has been saved.",
    }),
  serviceUpdated: () =>
    appToast.success({
      title: "Clinic Service Updated",
      description: "The clinic service setting has been updated.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}

export const dutyToasts = {
  started: () =>
    appToast.success({
      title: "Duty Started",
      description: "Your duty has started successfully.",
    }),
  ended: () =>
    appToast.success({
      title: "Duty Ended",
      description: "Your duty has ended successfully.",
    }),
  failed: (message?: string) =>
    appToast.error({
      title: "Operation Failed",
      description: message ?? FAILED_DESCRIPTION,
    }),
}
