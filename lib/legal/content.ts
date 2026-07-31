export type LegalSection = {
  heading: string
  paragraphs: string[]
}

export type LegalDocument = {
  title: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  lastUpdated: "July 31, 2026",
  intro:
    "These Terms of Service govern use of CampusCare, the digital clinic platform operated for the National University – Dasmariñas Health Services Office (HSO).",
  sections: [
    {
      heading: "1. Acceptance",
      paragraphs: [
        "By accessing CampusCare or signing in with a staff account, you agree to these Terms. If you do not agree, do not use the service.",
      ],
    },
    {
      heading: "2. Purpose of the service",
      paragraphs: [
        "CampusCare supports HSO clinic operations—including consultation requests, queue management, patient records, medical certificates, reports, and health announcements.",
        "It is not an emergency response system. For medical emergencies, seek immediate on-campus assistance or contact local emergency services.",
      ],
    },
    {
      heading: "3. Eligible users",
      paragraphs: [
        "Staff access is invite-based and limited to authorized HSO personnel and other approved campus roles. You must use your assigned work credentials and keep them confidential.",
        "You are responsible for activity under your account. Notify an HSO administrator immediately if you suspect unauthorized access.",
      ],
    },
    {
      heading: "4. Acceptable use",
      paragraphs: [
        "Use CampusCare only for legitimate clinic and campus health workflows. Do not attempt to access data outside your role, share patient information improperly, disrupt the service, or misuse certificates and records.",
      ],
    },
    {
      heading: "5. Clinical content",
      paragraphs: [
        "Records, certificates, and related documentation entered in CampusCare remain subject to HSO policies and applicable Philippine data-privacy and health regulations. CampusCare does not replace professional clinical judgment.",
      ],
    },
    {
      heading: "6. Availability",
      paragraphs: [
        "We aim to keep CampusCare available during clinic hours, but the service may be interrupted for maintenance, network issues, or circumstances beyond HSO control.",
      ],
    },
    {
      heading: "7. Changes",
      paragraphs: [
        "HSO may update these Terms as the platform evolves. Continued use after updates constitutes acceptance of the revised Terms.",
      ],
    },
    {
      heading: "8. Contact",
      paragraphs: [
        "Questions about these Terms may be sent to clinic@nu-dasma.edu.ph or raised with an HSO administrator on campus.",
      ],
    },
  ],
}

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "July 31, 2026",
  intro:
    "This Privacy Policy explains how CampusCare handles personal and health-related information for the NU Dasmariñas Health Services Office.",
  sections: [
    {
      heading: "1. Information we process",
      paragraphs: [
        "Depending on your role, CampusCare may process account details (name, work email, designation), consultation and queue data, patient demographic and visit records, certificate requests, and operational logs needed to run the clinic.",
      ],
    },
    {
      heading: "2. How we use information",
      paragraphs: [
        "Information is used to deliver clinic services, manage queues and appointments, maintain medical documentation, issue certificates, generate internal reports, publish health announcements, and secure staff access.",
      ],
    },
    {
      heading: "3. Access and sharing",
      paragraphs: [
        "Access is role-based. Only authorized staff can view clinical data relevant to their duties. We do not sell personal information. Disclosure may occur when required by law, university policy, or to protect health and safety.",
      ],
    },
    {
      heading: "4. Storage and security",
      paragraphs: [
        "Data is stored using CampusCare’s configured cloud and authentication providers with access controls, session management, and audit practices appropriate for a campus health workflow. No system is perfectly secure; report suspected incidents to HSO promptly.",
      ],
    },
    {
      heading: "5. Retention",
      paragraphs: [
        "Records are retained according to HSO and university retention requirements for clinical and administrative documentation, then disposed of or archived following those policies.",
      ],
    },
    {
      heading: "6. Your choices",
      paragraphs: [
        "Staff may request account corrections through an HSO administrator. Patients seeking access to or correction of their clinical records should follow HSO’s existing records request process.",
      ],
    },
    {
      heading: "7. Updates",
      paragraphs: [
        "This Policy may be updated to reflect operational or legal changes. The “Last updated” date at the top of this page will change when revisions are published.",
      ],
    },
    {
      heading: "8. Contact",
      paragraphs: [
        "For privacy questions related to CampusCare, contact clinic@nu-dasma.edu.ph or the Health Services Office at NU Dasmariñas.",
      ],
    },
  ],
}
