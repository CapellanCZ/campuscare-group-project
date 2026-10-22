/**
 * Run: npx --yes tsx lib/health/appointment-queue-eligibility.test.ts
 */
import {
  QUEUE_EARLY_ENTRY_MINUTES,
  filterActiveQueueTickets,
  isAppointmentEligibleForQueue,
  isTicketEligibleForActiveQueue,
  isUpcomingScheduledAppointment,
  manilaPreferredStartsAtIso,
} from "./appointment-queue-eligibility"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function manilaIso(ymd: string, hm: string): string {
  const t = hm.length === 5 ? `${hm}:00` : hm
  return new Date(`${ymd}T${t}+08:00`).toISOString()
}

let passed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`ok — ${name}`)
  } catch (error) {
    console.error(`FAIL — ${name}`)
    throw error
  }
}

const today = "2026-10-15"
const tomorrow = "2026-10-16"
// 20:00 Manila → early window opens at 19:45
const at1944 = new Date(manilaIso(today, "19:44"))
const at1945 = new Date(manilaIso(today, "19:45"))
const at1900 = new Date(manilaIso(today, "19:00"))
const at2000 = new Date(manilaIso(today, "20:00"))
const at2015 = new Date(manilaIso(today, "20:15"))
const appt2000 = manilaIso(today, "20:00")
const apptTomorrow2000 = manilaIso(tomorrow, "20:00")
const appt0800 = manilaIso(today, "08:00")

test(`1. still ineligible at 19:44 for 20:00 (${QUEUE_EARLY_ENTRY_MINUTES}m window)`, () => {
  assert(
    !isAppointmentEligibleForQueue(appt2000, at1944),
    "expected ineligible at 19:44"
  )
})

test(`2. eligible at 19:45 (exactly ${QUEUE_EARLY_ENTRY_MINUTES} min before 20:00)`, () => {
  assert(
    isAppointmentEligibleForQueue(appt2000, at1945),
    "expected eligible at 19:45"
  )
})

test("3. eligible at 8:00 PM", () => {
  assert(isAppointmentEligibleForQueue(appt2000, at2000), "expected eligible at 20:00")
})

test("4. eligible at 8:15 PM", () => {
  assert(isAppointmentEligibleForQueue(appt2000, at2015), "expected eligible at 20:15")
})

test("5. tomorrow's appointment not eligible today at same clock time", () => {
  assert(
    !isAppointmentEligibleForQueue(apptTomorrow2000, at2000),
    "expected tomorrow appointment ineligible"
  )
})

test("6. past morning appointment remains eligible in the evening", () => {
  assert(
    isAppointmentEligibleForQueue(appt0800, at2000),
    "8:00 AM today must stay eligible at 8:00 PM"
  )
})

test("7. walk-in / null startsAt always eligible", () => {
  assert(isAppointmentEligibleForQueue(null, at1900), "null should be eligible")
  assert(isAppointmentEligibleForQueue(undefined, at1900), "undefined should be eligible")
})

test("8. upcoming preview true before early window", () => {
  assert(
    isUpcomingScheduledAppointment(appt2000, at1944),
    "19:44 should still be upcoming for 20:00"
  )
  assert(
    !isUpcomingScheduledAppointment(appt2000, at1945),
    "19:45 should leave upcoming (now Waiting-eligible)"
  )
})

test("9. filter keeps upcoming waiting tickets before T−15", () => {
  const tickets = [
    { appointmentStartsAt: appt2000, status: "waiting" as const },
    { appointmentStartsAt: null, status: "waiting" as const },
    { appointmentStartsAt: appt0800, status: "waiting" as const },
  ]
  const atBefore = filterActiveQueueTickets(tickets, at1944)
  assert(atBefore.length === 3, `expected 3 tickets at 19:44, got ${atBefore.length}`)

  const atWindow = filterActiveQueueTickets(tickets, at1945)
  assert(atWindow.length === 3, `expected 3 tickets at 19:45, got ${atWindow.length}`)
})

test("10. called/ongoing stay visible even if startsAt were in the future", () => {
  assert(
    isTicketEligibleForActiveQueue(
      { appointmentStartsAt: apptTomorrow2000, status: "ongoing" },
      at2000
    ),
    "ongoing should remain visible"
  )
})

test("11. manilaPreferredStartsAtIso builds Asia/Manila instant", () => {
  const iso = manilaPreferredStartsAtIso(today, "20:00")
  assert(iso != null, "iso required")
  assert(iso === appt2000, `expected ${appt2000}, got ${iso}`)
})

test("12. timezone: UTC before Manila early window stays ineligible", () => {
  // 20:00 Manila = 12:00 UTC; early window opens 11:45 UTC.
  const beforeUtc = new Date("2026-10-15T11:44:00.000Z")
  assert(
    !isAppointmentEligibleForQueue(appt2000, beforeUtc),
    "must not become eligible early due to UTC clock"
  )
  const atEarlyUtc = new Date("2026-10-15T11:45:00.000Z")
  assert(
    isAppointmentEligibleForQueue(appt2000, atEarlyUtc),
    "eligible at Manila 19:45 / UTC 11:45"
  )
})

test("13. re-filter is idempotent", () => {
  const tickets = [
    { appointmentStartsAt: appt2000, status: "waiting" as const, id: "a" },
    { appointmentStartsAt: null, status: "waiting" as const, id: "b" },
  ]
  const once = filterActiveQueueTickets(tickets, at2000)
  const twice = filterActiveQueueTickets(once, at2000)
  assert(once.length === twice.length, "idempotent length")
  assert(once.map((t) => t.id).join() === twice.map((t) => t.id).join(), "idempotent ids")
})

console.log(`\n${passed} tests passed`)
