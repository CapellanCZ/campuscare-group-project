/**
 * Static demo slides for the login panel carousel.
 * Placeholder UI only — not live clinic data.
 */
export type LoginPreviewSlideId =
  | "dashboard"
  | "reports"
  | "announcements"
  | "queue"
  | "display"

export type LoginPreviewSlide = {
  id: LoginPreviewSlideId
  label: string
  title: string
  subtitle: string
  /** Left accent bar + stat number color */
  accentClass: string
  barClass: string
  stats: Array<{ value: string; label: string }>
}

export const loginPreviewSlides: LoginPreviewSlide[] = [
  {
    id: "dashboard",
    label: "Health Services · Dashboard",
    title: "Health Services",
    subtitle: "Visits & wellness",
    accentClass: "text-teal-600",
    barClass: "bg-teal-500",
    stats: [
      { value: "24", label: "Today" },
      { value: "8", label: "Waiting" },
      { value: "3", label: "Referrals" },
    ],
  },
  {
    id: "reports",
    label: "Health Services · Reports",
    title: "Reports & analytics",
    subtitle: "Visit trends & planning",
    accentClass: "text-blue-600",
    barClass: "bg-blue-600",
    stats: [
      { value: "128", label: "This week" },
      { value: "9–11", label: "Peak hours" },
      { value: "62%", label: "Consults" },
    ],
  },
  {
    id: "announcements",
    label: "Health Services · Announcements",
    title: "Announcements",
    subtitle: "Clinic notices & advisories",
    accentClass: "text-violet-600",
    barClass: "bg-violet-500",
    stats: [
      { value: "5", label: "Published" },
      { value: "2", label: "Scheduled" },
      { value: "1", label: "Draft" },
    ],
  },
  {
    id: "queue",
    label: "Health Services · Queue",
    title: "Queue management",
    subtitle: "Staff waiting-lane controls",
    accentClass: "text-sky-600",
    barClass: "bg-sky-500",
    stats: [
      { value: "8", label: "Waiting" },
      { value: "2", label: "Serving" },
      { value: "14", label: "Completed" },
    ],
  },
  {
    id: "display",
    label: "Health Services · Display",
    title: "Patients Queue Display",
    subtitle: "Lobby board for patients",
    accentClass: "text-emerald-600",
    barClass: "bg-emerald-500",
    stats: [
      { value: "0", label: "Waiting" },
      { value: "3", label: "Stations" },
      { value: "—", label: "Serving" },
    ],
  },
]
