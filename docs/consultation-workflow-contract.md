# Consultation workflow contract (mobile + web)

Shared contract for CampusCare mobile and web against the same Supabase project.

## Source of truth

Nurse intake and mobile consultation booking use the **`appointments`** table (not `consultation_requests`).  
`consultation_requests` remains in the schema but is **not** wired into nurse Requests for this flow.

## Constants

| Name | Value | Meaning |
|------|------:|---------|
| `EARLY_QUEUE_THRESHOLD` | `5` | Reserved `queue_number <= 5` → recommend come early / keep scheduled date |
| Live within-N | `5` | `patients_ahead <= 5` → recommend approach soon |
| Live “3 ahead” | `3` | Stricter prepare-now nudge |
| Campus clinic UUID | `34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b` | Single-campus `clinic_id` (no `clinics` table FK) |

Provider types: `physician` | `dentist`.

## Status lifecycle (`appointments.status`)

`pending` → `confirmed` | `cancelled` | `rescheduled` | `waitlisted` → (admit may re-queue) → `in_progress` → `completed` | `no_show`.

| Status | Meaning |
|--------|---------|
| `pending` | Submitted; may already hold a reserved queue number |
| `confirmed` | Nurse approved; keep existing ticket/number |
| `waitlisted` | Preferred date capacity full; no number yet |
| `cancelled` | Nurse declined / cancelled; ticket expired if any |
| `rescheduled` | Moved to another date (new capacity check) |
| `in_progress` | Visit started |
| `completed` | Visit finished |
| `no_show` | Patient did not attend |

## Tables

### Write path at submit

1. Read `clinic_consultation_capacity` for `provider_type` (`max_daily_slots`).
2. Count **active** `appointments` for Manila calendar day of `starts_at` + `provider_type` where `queue_number` is not null and status not in (`cancelled`, `no_show`, `completed`).
3. If `count < max` → insert `appointments` (`pending`, `provider_type`, `starts_at`/`ends_at` from preferred date/time, `reason`) + `health_queue_tickets` (`queue_number = count+1`, `service_date`, `station = nurse`, `appointment_id` set, `consultation_request_id` null) and set `queue_ticket_id` / `queue_number` on the appointment.
4. Else → insert appointment `waitlisted` only (`waitlisted_at` set); no ticket.

Mobile must call Edge Function **`submit-consultation-request`** (service role server-side). Do not insert appointments with the anon key under current staff-only insert RLS.  
`doctor_id` may be null (unassigned).

Response fields (backward compatible):

```ts
{
  appointmentId: string
  requestId: string // same as appointmentId for older clients
  status: "pending" | "waitlisted"
  providerType: "physician" | "dentist"
  preferredDate: string // YYYY-MM-DD
  queueNumber: number | null
  queueTicketId: string | null
  recommendComeEarly: boolean // queueNumber != null && queueNumber <= 5
  messageKeys: string[]
  capacityUsed?: number
  capacityMax?: number
}
```

### Nurse actions (web Requests → `appointments`)

| Action | Behavior |
|--------|----------|
| Approve | `pending` → `confirmed`; **keep** existing ticket/number |
| Decline | `cancelled` + release ticket (`expired`); clear `queue_ticket_id` / `queue_number` |
| Reschedule | New `starts_at`/`ends_at`; capacity-check → new number or `waitlisted` |
| Admit | From `waitlisted`: create ticket (nurse may force over soft cap) → typically `pending` |

### Service day

Check-in → vitals (incl. height/weight/RR) → auto handoff `station` from `provider_type` → doctor chart → complete:

- `appointments.status = completed`, ticket `completed`
- Optional cert on `medical_certificates` / `patients`

Physician/dentist boards should emphasize `confirmed` / `in_progress` (and `rescheduled`); nurse `waitlisted` / triage `pending` rows without assignment should not clutter the specialty clinic board.

## Live queue payload (Realtime / poll)

```ts
{
  queueNumber: number | null
  patientsAhead: number
  recommendApproachSoon: boolean // patientsAhead <= 5
  recommendComeEarly: boolean    // reserved queueNumber <= 5
  ticketStatus: string
  requestStatus: string // appointment.status
}
```

Message keys (mobile owns wording):

- `queue.assigned`
- `queue.waitlisted`
- `recommendation.early_slot` — come early; follow scheduled date
- `recommendation.within_five` — turn is near; proceed to clinic
- `queue.three_ahead`
- `queue.called`
- `request.approved` | `request.declined` | `request.rescheduled`

## Patient auth link (`patients.auth_user_id`)

Roster import creates `patients` rows with `auth_user_id = null`. Mobile must link after OTP:

1. Patient signs in (Auth OTP / magic link) → `auth.users` row exists.
2. Call RPC **`claim_my_patient_profile()`** (authenticated).  
   It matches `auth.users.email` → `patients.email` and sets `auth_user_id = auth.uid()`.
3. Subsequent reads use RLS `patients_select_own` (`auth_user_id = auth.uid()`) and helper `is_enrolled_patient()`.

Without the claim step, newly imported students cannot see their patient row (SELECT is blocked until linked). Staff can also backfill with:

```bash
npx tsx scripts/link-patient-auth.ts --all
# or one email:
npx tsx scripts/link-patient-auth.ts student@students.nu-dasma.edu.ph
```

Patients without an email cannot be Auth-linked until the roster/email is filled.

## Patient vitals (BP / heart rate)

Nurse intake stores visit vitals on **`health_queue_tickets`**:

- `vitals_bp_systolic` / `vitals_bp_diastolic`
- `vitals_heart_rate`

Patients may `SELECT` their own tickets (`patients_select_own_queue_tickets`) when `patients.auth_user_id = auth.uid()`.

Preferred mobile call after login + claim:

```ts
const { data, error } = await supabase.rpc("get_my_latest_vitals")
// data.bloodPressure → "120/80"
// data.heartRate → 72
// null when no vitals recorded yet
```

## Device tokens

Table `patient_device_tokens`: register/upsert `{ patient_id | user_id, token, platform }`.  
Push delivery is implemented by mobile infra; web emits domain events / rows staff can mirror in `notifications`.

## Queue display account

Public board URL: `/queue-management/display` (also works anonymously).

Role value on `public.users.primary_role` / `clinic_members.member_role`: **`queue_display`**  
(Requires migration `20260807040000_queue_display_web_role.sql` if the enum label is missing.)

Dedicated kiosk account (email + password, no OTP):

1. Supabase Auth → add user with email/password (enable Email password provider).  
   Optional: set user metadata `primary_role` = `queue_display` so the signup trigger sets it.
2. Or run in SQL Editor after the Auth user exists:

```sql
SELECT public.promote_queue_display_user('display@your-campus.edu');
```

3. Confirm:

```sql
SELECT id, email, primary_role, is_active FROM public.users WHERE primary_role = 'queue_display';
```

Hidden entry: on staff `/login`, triple-click the CampusCare logo → `/display-login`. That account can only use the public queue display.
