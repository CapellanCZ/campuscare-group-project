/**
 * Mobile/web submit: capacity check + pending appointment for nurse review.
 * Queue tickets are created only on nurse approve/admit.
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const CAMPUS_CLINIC_ID = "34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b"

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function resolveAdminApiKey(): string | null {
  const secretJson = Deno.env.get("SUPABASE_SECRET_KEYS")
  if (secretJson) {
    try {
      const parsed = JSON.parse(secretJson) as { default?: string }
      if (parsed.default) return parsed.default
    } catch {
      /* fall through */
    }
  }
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    null
  )
}

function manilaDateTimeToIso(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}+08:00`).toISOString()
}

/** Best-effort fan-out so nurses get realtime inbox rows on new bookings. */
async function notifyNursesOfScheduledAppointment(params: {
  supabaseUrl: string
  headers: Record<string, string>
  authHeaders: Record<string, string>
  clinicId: string
  patientName: string
  preferredDate: string
  preferredTime: string
  providerType: string
  status: "pending" | "waitlisted"
}): Promise<void> {
  try {
    const membersRes = await fetch(
      `${params.supabaseUrl}/rest/v1/clinic_members?clinic_id=eq.${params.clinicId}&member_role=eq.nurse&is_active=eq.true&select=user_id`,
      { headers: params.authHeaders }
    )
    if (!membersRes.ok) return
    const members = (await membersRes.json()) as { user_id: string }[]
    const nurseIds = [
      ...new Set(
        (members ?? [])
          .map((row) => row.user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    if (nurseIds.length === 0) return

    const specialty = params.providerType === "dentist" ? "Dental" : "Medical"
    const waitlisted = params.status === "waitlisted" ? " · waitlisted" : ""
    const now = new Date().toISOString()
    const rows = nurseIds.map((userId) => ({
      user_id: userId,
      type: "consultation_request",
      title: "Appointment scheduled",
      body: `${params.patientName} · ${specialty} · ${params.preferredDate} ${params.preferredTime}${waitlisted}`,
      href: "/nurse/requests",
      read_at: null,
      created_at: now,
    }))

    await fetch(`${params.supabaseUrl}/rest/v1/notifications`, {
      method: "POST",
      headers: params.headers,
      body: JSON.stringify(rows),
    })
  } catch {
    /* booking must succeed even if notify fails */
  }
}

/** Normalize specialty aliases from mobile (Dentist, dental, provider_type, …). */
function parseProviderType(value: unknown): "physician" | "dentist" | null {
  if (value == null) return null
  const raw = String(value).trim().toLowerCase()
  if (!raw) return null
  if (
    raw === "dentist" ||
    raw === "dental" ||
    raw === "dentistry" ||
    raw.includes("dentist") ||
    raw.includes("dental")
  ) {
    return "dentist"
  }
  if (
    raw === "physician" ||
    raw === "doctor" ||
    raw === "medical" ||
    raw === "general" ||
    raw === "md" ||
    raw.includes("physician") ||
    raw.includes("medical") ||
    raw.includes("general consult")
  ) {
    return "physician"
  }
  return null
}

function resolveProviderTypeFromBody(
  body: Record<string, unknown>
): "physician" | "dentist" | null {
  // Prefer specialty* — mobile may leave providerType as physician default.
  const fromSpecialty = parseProviderType(
    body.specialty ?? body.specialtyType ?? body.selectedSpecialty
  )
  if (fromSpecialty) return fromSpecialty

  const fromService = parseProviderType(
    body.serviceType ?? body.consultationType ?? body.service
  )
  const fromProvider = parseProviderType(
    body.providerType ?? body.provider_type
  )

  // Prefer dental service over a soft physician default from mobile.
  if (fromService === "dentist" && (!fromProvider || fromProvider === "physician")) {
    return "dentist"
  }

  return fromProvider ?? fromService
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const adminKey = resolveAdminApiKey()
  if (!supabaseUrl || !adminKey) {
    return json({ error: "Server misconfigured" }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const providerType = resolveProviderTypeFromBody(body)
  if (!providerType) {
    return json(
      {
        error:
          "providerType must be physician or dentist (also accepts specialty / provider_type / service)",
      },
      400
    )
  }

  const preferredDate = String(body.preferredDate ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return json({ error: "preferredDate must be YYYY-MM-DD" }, 400)
  }

  const patientName = String(body.patientName ?? "").trim()
  // Strip mobile/legacy wrappers like "Consultation request: headache"
  const reason = String(body.reason ?? "")
    .trim()
    .replace(/^consultation\s+requests?\s*[:\-–—]\s*/i, "")
    .trim()
  if (!patientName || !reason) {
    return json({ error: "patientName and reason are required" }, 400)
  }

  // preferredTime must be Asia/Manila HH:mm wall-clock — never UTC hours from toISOString().
  const preferredTimeRaw = String(body.preferredTime ?? "08:00").trim()
  if (/[TtZz]|[+-]\d{2}/.test(preferredTimeRaw)) {
    return json(
      {
        error:
          "preferredTime must be HH:mm in Asia/Manila (do not send UTC/ISO timestamps)",
      },
      400
    )
  }
  const preferredTime = preferredTimeRaw.slice(0, 5)
  if (!/^\d{2}:\d{2}$/.test(preferredTime)) {
    return json({ error: "preferredTime must be HH:mm" }, 400)
  }
  const clinicId = String(body.clinicId ?? "").trim() || CAMPUS_CLINIC_ID
  const doctorId = body.doctorId ? String(body.doctorId) : null
  const studentId = body.studentId ? String(body.studentId).trim() : null

  const headers = {
    apikey: adminKey,
    Authorization: `Bearer ${adminKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  }
  const authHeaders = {
    apikey: adminKey,
    Authorization: `Bearer ${adminKey}`,
  }

  const capacityRes = await fetch(
    `${supabaseUrl}/rest/v1/clinic_consultation_capacity?clinic_id=eq.${clinicId}&provider_type=eq.${providerType}&select=max_daily_slots`,
    { headers: authHeaders }
  )
  const capacityRows = (await capacityRes.json()) as { max_daily_slots: number }[]
  const max = Number(capacityRows?.[0]?.max_daily_slots) || 20

  const dayStart = encodeURIComponent(
    new Date(`${preferredDate}T00:00:00+08:00`).toISOString()
  )
  const dayEnd = encodeURIComponent(
    new Date(`${preferredDate}T23:59:59.999+08:00`).toISOString()
  )
  // Pending/confirmed hold capacity; waitlisted is overflow and does not count.
  const apptRes = await fetch(
    `${supabaseUrl}/rest/v1/appointments?provider_type=eq.${providerType}&starts_at=gte.${dayStart}&starts_at=lte.${dayEnd}&status=in.(pending,rescheduled,confirmed,in_progress)&select=id`,
    { headers: authHeaders }
  )
  const appts = (await apptRes.json()) as { id: string }[]
  const used = Array.isArray(appts) ? appts.length : 0

  const startsAt = manilaDateTimeToIso(preferredDate, preferredTime)
  const endsAt = new Date(
    new Date(startsAt).getTime() + 30 * 60 * 1000
  ).toISOString()
  const now = new Date().toISOString()

  // Optional patient lookup
  let patientId: string | null = body.patientId
    ? String(body.patientId)
    : null
  const patientIdsForCheck: string[] = []
  if (patientId) patientIdsForCheck.push(patientId)
  if (studentId) {
    const pRes = await fetch(
      `${supabaseUrl}/rest/v1/patients?or=(student_id.eq.${encodeURIComponent(studentId)},employee_id.eq.${encodeURIComponent(studentId)})&select=id&limit=5`,
      { headers: authHeaders }
    )
    const pRows = (await pRes.json()) as { id: string }[]
    if (!patientId) patientId = pRows?.[0]?.id ?? null
    for (const row of pRows ?? []) {
      if (row?.id && !patientIdsForCheck.includes(row.id)) {
        patientIdsForCheck.push(row.id)
      }
    }
  }

  // One open booking per patient + specialty — block mobile double-book.
  if (patientIdsForCheck.length > 0) {
    const openStatuses = "pending,waitlisted,rescheduled,confirmed,in_progress"
    const patientFilter = encodeURIComponent(`(${patientIdsForCheck.join(",")})`)
    const openRes = await fetch(
      `${supabaseUrl}/rest/v1/appointments?clinic_id=eq.${clinicId}&provider_type=eq.${providerType}&patient_id=in.${patientFilter}&status=in.(${openStatuses})&select=id,status&order=starts_at.asc&limit=1`,
      { headers: authHeaders }
    )
    if (openRes.ok) {
      const openRows = (await openRes.json()) as { id: string; status: string }[]
      const existing = openRows?.[0]
      if (existing) {
        const messages: Record<string, string> = {
          pending:
            "You already have a pending consultation request for this specialty. Wait for nurse review or cancel it before booking again.",
          waitlisted:
            "You are already on the waitlist for this specialty. Wait for an opening or cancel that request before booking again.",
          rescheduled:
            "You already have a rescheduled consultation request for this specialty. Wait for nurse review before booking again.",
          confirmed:
            "You already have an active consultation for this specialty. Finish or cancel it before booking again.",
          in_progress:
            "You already have an active consultation for this specialty. Finish or cancel it before booking again.",
        }
        return json(
          {
            error:
              messages[existing.status] ??
              "You already have an open consultation request for this specialty.",
            code: "double_booking",
            existingAppointmentId: existing.id,
            existingStatus: existing.status,
          },
          409
        )
      }
    }
  }

  if (used >= max) {
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: patientId,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "waitlisted",
        reason,
        provider_type: providerType,
        waitlisted_at: now,
      }),
    })
    if (!insertRes.ok) return json({ error: await insertRes.text() }, 400)
    const rows = (await insertRes.json()) as { id: string }[]
    await notifyNursesOfScheduledAppointment({
      supabaseUrl,
      headers,
      authHeaders,
      clinicId,
      patientName,
      preferredDate,
      preferredTime,
      providerType,
      status: "waitlisted",
    })
    return json({
      appointmentId: rows[0]?.id,
      requestId: rows[0]?.id,
      status: "waitlisted",
      providerType,
      preferredDate,
      preferredTime,
      startsAt,
      queueNumber: null,
      queueTicketId: null,
      recommendComeEarly: false,
      messageKeys: ["queue.waitlisted"],
      capacityUsed: used,
      capacityMax: max,
    })
  }

  // Pending only — nurse approve creates the queue ticket + number.
  const insertAppt = await fetch(`${supabaseUrl}/rest/v1/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clinic_id: clinicId,
      doctor_id: doctorId,
      patient_id: patientId,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "pending",
      reason,
      provider_type: providerType,
    }),
  })
  if (!insertAppt.ok) return json({ error: await insertAppt.text() }, 400)
  const apptRows = (await insertAppt.json()) as { id: string }[]
  const appointmentId = apptRows[0]?.id

  await notifyNursesOfScheduledAppointment({
    supabaseUrl,
    headers,
    authHeaders,
    clinicId,
    patientName,
    preferredDate,
    preferredTime,
    providerType,
    status: "pending",
  })

  return json({
    appointmentId,
    requestId: appointmentId,
    status: "pending",
    providerType,
    preferredDate,
    preferredTime,
    startsAt,
    queueNumber: null,
    queueTicketId: null,
    recommendComeEarly: false,
    messageKeys: ["queue.pending_review"],
    capacityUsed: used + 1,
    capacityMax: max,
  })
})
