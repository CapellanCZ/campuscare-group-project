export type NavItem = {
  label: string
  href: string
}

export type FeatureItem = {
  title: string
  description: string
}

export type StepItem = {
  title: string
  description: string
}

export type FaqItem = {
  question: string
  answer: string
}

export type FooterLinkGroup = {
  title: string
  links: NavItem[]
}

export const landingNavItems: NavItem[] = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
]

export const features: FeatureItem[] = [
  {
    title: "Consultation Requests",
    description:
      "HSO staff can receive, triage, and track consultation requests in one centralized queue.",
  },
  {
    title: "Queue Management",
    description:
      "The HSO can manage consultation queues in real time and reduce waiting bottlenecks.",
  },
  {
    title: "Patient Records",
    description:
      "Digital records centralize patient history for better continuity of campus healthcare.",
  },
  {
    title: "Medical Certificates",
    description:
      "Generate and track medical certificates quickly through standardized digital workflows.",
  },
  {
    title: "Reports & Analytics",
    description:
      "Operational reports help the office monitor trends, demand, and service performance.",
  },
  {
    title: "Health Announcements",
    description:
      "Broadcast health advisories and reminders to keep the university community informed.",
  },
]

export const consultationSteps: StepItem[] = [
  {
    title: "Submit Request",
    description: "A user submits a consultation request through the web or mobile app.",
  },
  {
    title: "Queue Assignment",
    description: "The system assigns and updates queue status for efficient processing.",
  },
  {
    title: "HSO Review",
    description:
      "HSO personnel review request details and prepare for the consultation session.",
  },
  {
    title: "Consultation",
    description:
      "The patient is assisted by HSO staff with documented notes and outcomes.",
  },
  {
    title: "Completion & Follow-up",
    description:
      "The case is completed, records are updated, and certificates are issued when needed.",
  },
]

export const benefits: FeatureItem[] = [
  {
    title: "Faster Services",
    description: "Less manual processing means shorter queues and quicker response times.",
  },
  {
    title: "Digital Records",
    description:
      "Reliable documentation improves continuity of care and reduces filing overhead.",
  },
  {
    title: "Better Accessibility",
    description:
      "Users can request services remotely with consistent access across devices.",
  },
  {
    title: "Secure Information",
    description:
      "Health data is centralized with controlled access and traceable activity.",
  },
]

export const userTypes: FeatureItem[] = [
  {
    title: "Students",
    description:
      "Access consultations, queue updates, and health announcements from one portal.",
  },
  {
    title: "Faculty",
    description:
      "Request support efficiently and keep medical documentation organized digitally.",
  },
  {
    title: "Non-Teaching Employees",
    description:
      "Use streamlined health services with transparent queue and request visibility.",
  },
  {
    title: "HSO Personnel",
    description:
      "Manage daily operations, patient records, and reporting with a unified system.",
  },
]

export const faqs: FaqItem[] = [
  {
    question: "Who can use CampusCare?",
    answer:
      "CampusCare is used by authorized Health Services Office personnel at National University - Dasmarinas.",
  },
  {
    question: "Can users request consultations online?",
    answer:
      "Yes. Users can submit consultation requests digitally and monitor queue progress in the platform.",
  },
  {
    question: "Are records stored securely?",
    answer:
      "CampusCare is designed with secure handling of health information and controlled access for authorized personnel.",
  },
  {
    question: "Does CampusCare support medical certificates?",
    answer:
      "Yes. HSO personnel can generate and manage medical certificates through the digital workflow.",
  },
]

export const contactDetails = {
  location:
    "Health Services Office, National University - Dasmarinas, Cavite, Philippines",
  officeHours: "Monday to Friday, 8:00 AM to 5:00 PM",
  email: "hso@nu-dasma.edu.ph",
  phone: "(046) 000-0000",
}

export const heroHighlights = [
  "HSO staff workspace for consultation intake and queue coordination",
  "Centralized records and medical certificate processing",
  "Operational visibility for day-to-day clinic service delivery",
]

export const footerLinkGroups: FooterLinkGroup[] = [
  {
    title: "Company",
    links: [
      { label: "Home", href: "#home" },
      { label: "About Us", href: "#about" },
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Contact",
    links: [],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/login" },
      { label: "Terms & Conditions", href: "/login" },
      { label: "Data Privacy Notice", href: "/login" },
    ],
  },
]
