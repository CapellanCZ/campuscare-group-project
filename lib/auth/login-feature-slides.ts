export type LoginFeatureSlideId =
  | "consultations"
  | "queue"
  | "patient-records"
  | "medical-consultations"
  | "medical-documents"
  | "reports"
  | "queue-display"

export type LoginFeatureSlide = {
  id: LoginFeatureSlideId
  category: string
  title: string
  description: string
}

/** Static marketing slides for the login feature carousel (no live data). */
export const LOGIN_FEATURE_SLIDES: LoginFeatureSlide[] = [
  {
    id: "consultations",
    category: "Intake",
    title: "Consultation requests in one place",
    description:
      "Review pending medical and dental requests, approve visits, and keep the clinic day moving.",
  },
  {
    id: "queue",
    category: "Queue",
    title: "Live queue for every station",
    description:
      "Track waiting patients, call the next ticket, and keep nurse, physician, and dentist lanes organized.",
  },
  {
    id: "patient-records",
    category: "Records",
    title: "Campus patient directory",
    description:
      "Search students, faculty, and employees, update clinical profiles, and open visit history quickly.",
  },
  {
    id: "medical-consultations",
    category: "Clinical",
    title: "Document each consultation",
    description:
      "Capture complaints, vitals, assessment, treatment, and advice with a clear visit workflow.",
  },
  {
    id: "medical-documents",
    category: "Documents",
    title: "Issue certificates and prescriptions",
    description:
      "Generate Medical Certifications, NFG clearances, May Go Home slips, and prescriptions from the visit.",
  },
  {
    id: "reports",
    category: "Insights",
    title: "Clinic progress reports",
    description:
      "Export operational summaries that help Health Services present campus clinic activity clearly.",
  },
  {
    id: "queue-display",
    category: "Display",
    title: "Public queue board",
    description:
      "Show now-serving tickets on a dedicated display so patients know when it is their turn.",
  },
]
