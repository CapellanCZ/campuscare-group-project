export type LegalSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type LegalDocument = {
  title: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "August 2026",
  intro:
    "Welcome to CampusCare, a web and mobile platform developed for the Health Services Office (HSO) of National University – Dasmariñas. Your privacy is important to us, and we are committed to protecting the personal and health information you provide while using our system.",
  sections: [
    {
      heading: "Information We Collect",
      paragraphs: ["CampusCare may collect the following information:"],
      bullets: [
        "Personal Information (e.g., name, student/employee ID, email address, contact number)",
        "Academic or employment information necessary for user verification",
        "Health-related information submitted during consultations",
        "System activity logs and usage information",
      ],
    },
    {
      heading: "How We Use Your Information",
      paragraphs: ["The information collected is used to:"],
      bullets: [
        "Verify user identity.",
        "Manage consultation requests and patient records.",
        "Improve the delivery of health services.",
        "Generate operational reports and analytics.",
        "Maintain the security and integrity of the system.",
      ],
    },
    {
      heading: "Information Security",
      paragraphs: [
        "CampusCare implements appropriate administrative, technical, and organizational measures to protect personal information against unauthorized access, disclosure, alteration, or destruction.",
      ],
    },
    {
      heading: "Information Sharing",
      paragraphs: [
        "Personal information is accessible only to authorized Health Services Office personnel and system administrators with appropriate access privileges. Information will not be shared with third parties unless required by law or with the user's consent.",
      ],
    },
    {
      heading: "User Rights",
      paragraphs: ["Users have the right to:"],
      bullets: [
        "Access their personal information.",
        "Request corrections to inaccurate information.",
        "Request deletion of information when legally applicable.",
        "Withdraw consent, subject to applicable laws and institutional policies.",
      ],
    },
    {
      heading: "Changes to this Policy",
      paragraphs: [
        "This Privacy Policy may be updated periodically. Continued use of CampusCare constitutes acceptance of any revisions.",
      ],
    },
  ],
}

export const termsOfUse: LegalDocument = {
  title: "Terms of Use",
  lastUpdated: "August 2026",
  intro:
    "By accessing and using CampusCare, you agree to comply with the following terms and conditions.",
  sections: [
    {
      heading: "Authorized Users",
      paragraphs: [
        "CampusCare is intended exclusively for:",
        "Only verified university members may access the system.",
      ],
      bullets: [
        "Students",
        "Faculty Members",
        "Non-Teaching Employees",
        "Authorized Health Services Office Personnel",
      ],
    },
    {
      heading: "User Responsibilities",
      paragraphs: ["Users agree to:"],
      bullets: [
        "Provide accurate and truthful information.",
        "Keep login credentials confidential.",
        "Use the system only for legitimate university health-related purposes.",
        "Respect the privacy of other users.",
      ],
    },
    {
      heading: "Prohibited Activities",
      paragraphs: ["Users shall not:"],
      bullets: [
        "Attempt unauthorized access to the system.",
        "Share another user's account.",
        "Modify or misuse system data.",
        "Upload malicious software or harmful content.",
        "Use the platform for unlawful purposes.",
      ],
    },
    {
      heading: "Availability",
      paragraphs: [
        "While every effort is made to ensure continuous availability, CampusCare does not guarantee uninterrupted service due to maintenance, updates, or unforeseen technical issues.",
      ],
    },
    {
      heading: "Limitation of Liability",
      paragraphs: [
        "CampusCare is developed to assist the Health Services Office in managing health services. The system does not replace professional medical judgment or emergency healthcare services.",
      ],
    },
    {
      heading: "Termination of Access",
      paragraphs: [
        "The Health Services Office reserves the right to suspend or terminate accounts that violate these Terms of Use or university policies.",
      ],
    },
  ],
}

export const dataPrivacyNotice: LegalDocument = {
  title: "Data Privacy Notice",
  lastUpdated: "August 2026",
  intro:
    "CampusCare recognizes the importance of protecting personal data and is committed to complying with the Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.",
  sections: [
    {
      heading: "Purpose of Data Collection",
      paragraphs: [
        "Personal information is collected solely for legitimate Health Services Office operations, including:",
      ],
      bullets: [
        "User verification",
        "Consultation management",
        "Patient record management",
        "Queue management",
        "Medical certificate processing",
        "Health service reporting",
      ],
    },
    {
      heading: "Personal Data Collected",
      paragraphs: ["CampusCare may collect:"],
      bullets: [
        "Full Name",
        "University ID Number",
        "Contact Information",
        "Email Address",
        "College or Department",
        "Employment Classification (Faculty or Non-Teaching Employee)",
        "Medical and consultation records",
        "System activity logs",
      ],
    },
    {
      heading: "Data Protection",
      paragraphs: [
        "Personal information is protected through appropriate security measures, including controlled access, authentication, and secure storage. Access is limited to authorized personnel whose responsibilities require such information.",
      ],
    },
    {
      heading: "Data Retention",
      paragraphs: [
        "Personal data shall be retained only for as long as necessary to fulfill the purposes for which it was collected or as required by applicable laws and university policies.",
      ],
    },
    {
      heading: "Data Subject Rights",
      paragraphs: [
        "In accordance with the Data Privacy Act of 2012, users have the right to:",
      ],
      bullets: [
        "Be informed about the collection and processing of their personal data.",
        "Access their personal information.",
        "Correct inaccurate or incomplete information.",
        "Request the deletion or blocking of personal information, when applicable.",
        "File a complaint with the appropriate authorities if their privacy rights are violated.",
      ],
    },
    {
      heading: "Contact Information",
      paragraphs: [
        "For questions regarding privacy or data protection, users may contact the Health Services Office of National University – Dasmariñas through its official communication channels.",
      ],
    },
  ],
}
