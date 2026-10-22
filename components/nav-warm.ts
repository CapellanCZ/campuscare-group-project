type ClinicRole = "nurse" | "physician" | "dentist" | "admin"

const warmed = new Map<string, number>()
const WARM_TTL_MS = 45_000

function warmKey(href: string, role: ClinicRole) {
  return `${role}:${href.split("?")[0]}`
}

/**
 * Warm feature data for the destination being opened.
 * Dynamic imports keep unused prefetch→action graphs out of the sidebar chunk.
 * Deduped so hover + click (or rapid tab hopping) does not stack fetches.
 */
export async function warmStaffRouteData(href: string, role: ClinicRole) {
  const key = warmKey(href, role)
  const last = warmed.get(key) ?? 0
  if (Date.now() - last < WARM_TTL_MS) return
  warmed.set(key, Date.now())

  if (href.includes("/consultations")) {
    const { prefetchConsultationsPage } = await import(
      "@/features/consultations/lib/prefetch-consultations"
    )
    prefetchConsultationsPage(role)
    return
  }
  if (href.includes("/queue") && !href.includes("/display")) {
    const { prefetchQueuePage } = await import(
      "@/features/queue/lib/prefetch-queue"
    )
    prefetchQueuePage(role)
    return
  }
  if (href.includes("/requests")) {
    const { prefetchRequestsPage } = await import(
      "@/features/requests/lib/prefetch-requests"
    )
    prefetchRequestsPage(role)
    return
  }
  if (href.includes("/patients") || href.includes("/bin")) {
    const { prefetchPatientsPage } = await import(
      "@/features/patients/lib/prefetch-patients"
    )
    prefetchPatientsPage(role)
    return
  }
  if (href.includes("/certificates")) {
    const { prefetchCertificatesPage } = await import(
      "@/features/certificates/lib/prefetch-certificates"
    )
    prefetchCertificatesPage(role)
    return
  }
  if (href.includes("/announcements")) {
    const { prefetchAnnouncementsPage } = await import(
      "@/features/announcements/lib/prefetch-announcements"
    )
    prefetchAnnouncementsPage(role)
    return
  }
  if (
    href.endsWith("/dashboard") ||
    href === `/${role}` ||
    href === `/${role}/`
  ) {
    const { prefetchDashboardPage } = await import(
      "@/features/dashboard/lib/prefetch-dashboard"
    )
    prefetchDashboardPage(role)
  }
}
