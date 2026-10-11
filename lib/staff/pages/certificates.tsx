import { CertificatesPage } from "@/components/certificates/certificates-demo-page"
import { requireStaffModule } from "@/lib/auth/require-module"

export async function StaffCertificatesPage() {
  const access = await requireStaffModule("medical_certificates")

  return (
    <CertificatesPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      }}
      initialStats={{
        issuedThisMonth: 0,
        issuedToday: 0,
        drafts: 0,
        pending: 0,
      }}
      hydrateFromCache
    />
  )
}
