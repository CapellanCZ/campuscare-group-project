import type { ComponentType } from "react"
import {
  IconChartBar,
  IconClipboardHeart,
  IconCertificate,
  IconFileDescription,
  IconSpeakerphone,
  IconStack2,
} from "@tabler/icons-react"

export type NavLink = {
  label: string
  href: string
  id: string
}

export type FeatureItem = {
  title: string
  description: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

export type HowItWorksStep = {
  step: number
  title: string
  description: string
  label: string
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export const navLinks: NavLink[] = [
  { label: "Home", href: "#home", id: "home" },
  { label: "About", href: "#about", id: "about" },
  { label: "Features", href: "#features", id: "features" },
  { label: "How It Works", href: "#how-it-works", id: "how-it-works" },
  { label: "FAQ", href: "#faq", id: "faq" },
  { label: "Contact", href: "#contact", id: "contact" },
]

export const landingNavItems = navLinks

export const heroRotatingPhrases = [
  "Faster clinic visits for every Bulldog",
  "Queue visibility without the waiting-room guesswork",
  "Records, certificates, and care—connected",
]

export const heroCopy = {
  brand: "CampusCare",
  headline: "Campus health services, designed for clarity",
  description:
    "CampusCare helps the NU Dasmariñas Health Services Office manage consultations, queues, and patient records in one calm, modern workspace.",
}

export const aboutCopy = {
  eyebrow: "About CampusCare",
  title: "Built for the NU Dasmariñas Health Services Office",
  body: [
    "The Health Services Office (HSO) of National University – Dasmariñas supports the well-being of students, faculty, and staff by providing accessible campus-based clinical care and health coordination.",
    "From walk-in consultations and preventive services to documentation and follow-up, HSO keeps the campus community healthy so learning and work can continue with confidence.",
    "CampusCare digitizes that day-to-day clinic flow—so requests are clearer, queues are transparent, and records stay ready when staff need them.",
  ],
}

export const features: FeatureItem[] = [
  {
    title: "Consultation Requests",
    description:
      "Submit and organize clinic visit requests without paper slips or scattered messages.",
    icon: IconClipboardHeart,
  },
  {
    title: "Queue Management",
    description:
      "Give patients and staff a shared view of who’s next—reducing crowding and confusion.",
    icon: IconStack2,
  },
  {
    title: "Patient Records",
    description:
      "Keep consultation history and care notes in one secure place for authorized clinic staff.",
    icon: IconFileDescription,
  },
  {
    title: "Medical Certificates",
    description:
      "Streamline certificate requests and issuance with clear status from request to release.",
    icon: IconCertificate,
  },
  {
    title: "Reports & Analytics",
    description:
      "Understand visit volume, peak hours, and service trends to plan staffing and care.",
    icon: IconChartBar,
  },
  {
    title: "Health Announcements",
    description:
      "Publish clinic advisories, vaccine schedules, and wellness updates to the campus community.",
    icon: IconSpeakerphone,
  },
]

export const howItWorksSteps: HowItWorksStep[] = [
  {
    step: 1,
    label: "Step 1",
    title: "Submit a consultation request",
    description:
      "Patients or staff start a visit request with the reason for consultation and preferred timing.",
  },
  {
    step: 2,
    label: "Step 2",
    title: "Receive queue confirmation",
    description:
      "The clinic confirms the request and issues a queue ticket so everyone knows the visit is logged.",
  },
  {
    step: 3,
    label: "Step 3",
    title: "Track your place in line",
    description:
      "Live queue updates help patients prepare for their turn without hovering at the counter.",
  },
  {
    step: 4,
    label: "Step 4",
    title: "Attend the consultation",
    description:
      "Clinicians see the request context and continue care with the information already on hand.",
  },
  {
    step: 5,
    label: "Step 5",
    title: "Complete and update records",
    description:
      "Notes, certificates, and follow-ups are recorded so the next visit starts from a complete chart.",
  },
]

export const benefits = features
export const heroHighlights = heroRotatingPhrases
export const consultationSteps = howItWorksSteps
export const userTypes = [
  {
    title: "Students",
    description: "Book and track campus clinic visits.",
  },
  {
    title: "Clinic staff",
    description: "Manage queues, records, and certificates.",
  },
]

export const faqs: FaqItem[] = [
  {
    id: "who",
    question: "Who can use CampusCare?",
    answer:
      "CampusCare is built for NU Dasmariñas Health Services Office staff and the campus community they serve. Staff sign in with their work email; students and patients interact through clinic workflows managed by HSO.",
  },
  {
    id: "hours",
    question: "What are the Health Services Office hours?",
    answer:
      "The clinic is open Mondays to Fridays from 7:00 AM to 9:00 PM, and Saturdays from 7:00 AM to 7:00 PM. Physician and dentist hours vary by day—check CampusCare or Health Announcements for clinician schedules and break advisories.",
  },
  {
    id: "queue",
    question: "How does queue management work?",
    answer:
      "After a consultation request is accepted, you receive a queue position. Staff advance the queue as consultations finish so waiting times stay visible and fair.",
  },
  {
    id: "certificates",
    question: "Can I request a medical certificate online?",
    answer:
      "Yes. Certificate requests can be submitted through CampusCare, tracked by status, and released according to HSO policies and clinician approval.",
  },
  {
    id: "emergency",
    question: "What should I do in a medical emergency?",
    answer:
      "CampusCare is for scheduled and walk-in clinic workflows. For emergencies, seek immediate on-campus emergency assistance or call local emergency services first.",
  },
  {
    id: "access",
    question: "How do staff get an account?",
    answer:
      "Clinic access is invite-based. Ask an HSO administrator to approve your staff profile, then sign in with your work email using a one-time password.",
  },
]

export const footerContact = {
  location: "NU Dasmariñas, 4th Floor",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=National+University+Dasmarinas",
  hours: "Mon–Fri 7:00 AM – 9:00 PM · Sat 7:00 AM – 7:00 PM",
  email: "clinic@nu-dasma.edu.ph",
}

export const footerLegalLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
] as const

export const footerBlurb =
  "CampusCare connects the NU Dasmariñas Health Services Office with a clearer digital clinic experience—from request to consultation completion."
