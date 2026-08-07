/**
 * Mobile/web submit: capacity check + reserve queue number on appointments.
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const EARLY_QUEUE_THRESHOLD = 5
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

  const providerType = String(body.providerType ?? "").trim()
  if (providerType !== "physician" && providerType !== "dentist") {
    return json({ error: "providerType must be physician or dentist" }, 400)
  }

  const preferredDate = String(body.preferredDate ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return json({ error: "preferredDate must be YYYY-MM-DD" }, 400)
  }

  const patientName = String(body.patientName ?? "").trim()
  const reason = String(body.reason ?? "").trim()
  if (!patientName || !reason) {
    return json({ error: "patientName and reason are required" }, 400)
  }

  const preferredTime = String(body.preferredTime ?? "08:00").trim().slice(0, 5)
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
  const apptRes = await fetch(
    `${supabaseUrl}/rest/v1/appointments?provider_type=eq.${providerType}&starts_at=gte.${dayStart}&starts_at=lte.${dayEnd}&queue_number=not.is.null&status=not.in.(cancelled,no_show,completed)&select=id`,
    { headers: authHeaders }
  )
  const appts = (await apptRes.json()) as { id: string }[]
  const used = Array.isArray(appts) ? appts.length : 0

  const startsAt = manilaDateTimeToIso(preferredDate, preferredTime)
  const endsAt = new Date(
    new Date(startsAt).getTime() + 30 * 60 * 1000
  ).toISOString()
  const now = new Date().toISOString()
  const service =
    providerType === "dentist" ? "Dental consultation" : "General consultation"

  // Optional patient lookup
  let patientId: string | null = body.patientId
    ? String(body.patientId)
    : null
  if (!patientId && studentId) {
    const pRes = await fetch(
      `${supabaseUrl}/rest/v1/patients?or=(student_id.eq.${encodeURIComponent(studentId)},employee_id.eq.${encodeURIComponent(studentId)})&select=id&limit=1`,
      { headers: authHeaders }
    )
    const pRows = (await pRes.json()) as { id: string }[]
    patientId = pRows?.[0]?.id ?? null
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
    return json({
      appointmentId: rows[0]?.id,
      requestId: rows[0]?.id,
      status: "waitlisted",
      providerType,
      preferredDate,
      queueNumber: null,
      queueTicketId: null,
      recommendComeEarly: false,
      messageKeys: ["queue.waitlisted"],
      capacityUsed: used,
      capacityMax: max,
    })
  }

  const nextNumber = used + 1
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
      queue_number: nextNumber,
    }),
  })
  if (!insertAppt.ok) return json({ error: await insertAppt.text() }, 400)
  const apptRows = (await insertAppt.json()) as { id: string }[]
  const appointmentId = apptRows[0]?.id
  const ticketCode = `CR-${String(nextNumber).padStart(4, "0")}`

  const insertTicket = await fetch(
    `${supabaseUrl}/rest/v1/health_queue_tickets`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        ticket_code: ticketCode,
        queue_position: nextNumber,
        queue_number: nextNumber,
        estimated_wait_minutes: nextNumber * 10,
        status: "waiting",
        station: "nurse",
        service_date: preferredDate,
        patient_id: patientId,
        patient_name: patientName,
        campus_id: studentId,
        consultation_type: service,
        chief_complaint: reason,
        appointment_id: appointmentId,
        provider_type: providerType,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    }
  )
  if (!insertTicket.ok) {
    await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${appointmentId}`, {
      method: "DELETE",
      headers: authHeaders,
    })
    return json({ error: await insertTicket.text() }, 400)
  }
  const ticketRows = (await insertTicket.json()) as { id: string }[]
  const queueTicketId = ticketRows[0]?.id

  await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${appointmentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      queue_ticket_id: queueTicketId,
      queue_number: nextNumber,
      updated_at: now,
    }),
  })

  const early = nextNumber <= EARLY_QUEUE_THRESHOLD
  return json({
    appointmentId,
    requestId: appointmentId,
    status: "pending",
    providerType,
    preferredDate,
    queueNumber: nextNumber,
    queueTicketId,
    recommendComeEarly: early,
    messageKeys: early
      ? ["queue.assigned", "recommendation.early_slot"]
      : ["queue.assigned"],
    capacityUsed: used + 1,
    capacityMax: max,
  })
})
