import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"

import { StateBlock } from "@/features/common/components/state-block"
import { ClinicalVisitMode } from "@/features/clinical/components/clinical-visit-mode"
import { loadConsultationWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import { ensureConsultationFromAppointment } from "@/lib/health/consultation-lifecycle"
import { getStaffAccess } from "@/lib/auth/access"
import { createClient } from "@/lib/supabase/server"

type PageProps = {
  params: Promise<{ id: string }>
}

async function resolveConsultationId(id: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: byId } = await supabase
    .from("consultations")
    .select("id")
    .eq("id", id)
    .maybeSingle()
  if (byId?.id) return byId.id as string

  const { data: byAppointment } = await supabase
    .from("consultations")
    .select("id")
    .eq("appointment_id", id)
    .maybeSingle()
  if (byAppointment?.id) {
    redirect(`/physician/consultation/${byAppointment.id}`)
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (appointment?.id) {
    const access = await getStaffAccess()
    if (!access) return null
    const ensured = await ensureConsultationFromAppointment({
      appointmentId: id,
      staffName: access.fullName,
      client: supabase,
    })
    if ("id" in ensured) {
      redirect(`/physician/consultation/${ensured.id}`)
    }
  }

  return null
}

async function Content({ id }: { id: string }) {
  const consultationId = await resolveConsultationId(id)
  if (!consultationId) notFound()

  const workspace = await loadConsultationWorkspace(consultationId, "physician")
  return <ClinicalVisitMode workspace={workspace} />
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<StateBlock state="loading" />}>
      <Content id={id} />
    </Suspense>
  )
}
