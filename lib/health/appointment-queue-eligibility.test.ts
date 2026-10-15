/**
 * Run: npx --yes tsx lib/health/appointment-queue-eligibility.test.ts
 */
import {
  filterActiveQueueTickets,
  isAppointmentEligibleForQueue,
  isTicketEligibleForActiveQueue,
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
const at1900 = new Date(manilaIso(today, "19:00"))
const at1959 = new Date(manilaIso(today, "19:59"))
const at2000 = new Date(manilaIso(today, "20:00"))
const at2015 = new Date(manilaIso(today, "20:15"))
const appt2000 = manilaIso(today, "20:00")
const apptTomorrow2000 = manilaIso(tomorrow, "20:00")
const appt0800 = manilaIso(today, "08:00")

test("1. 8:00 PM appointment not eligible at 7:00 PM", () => {
  assert(!isAppointmentEligibleForQueue(appt2000, at1900), "expected ineligible at 19:00")
})

test("2. still ineligible at 7:59 PM", () => {
  assert(!isAppointmentEligibleForQueue(appt2000, at1959), "expected ineligible at 19:59")
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

test("6. past morning appointment remains eligible in the evening (not treated as future)", () => {
  assert(
    isAppointmentEligibleForQueue(appt0800, at2000),
    "8:00 AM today must stay eligible at 8:00 PM"
  )
})

test("7. walk-in / null startsAt always eligible", () => {
  assert(isAppointmentEligibleForQueue(null, at1900), "null should be eligible")
  assert(isAppointmentEligibleForQueue(undefined, at1900), "undefined should be eligible")
})

test("8. filterActiveQueueTickets drops future scheduled waiting tickets only", () => {
  const tickets = [
    { appointmentStartsAt: appt2000, status: "waiting" as const },
    { appointmentStartsAt: null, status: "waiting" as const },
    { appointmentStartsAt: appt0800, status: "waiting" as const },
  ]
  const atSeven = filterActiveQueueTickets(tickets, at1900)
  assert(atSeven.length === 2, `expected 2 tickets at 19:00, got ${atSeven.length}`)
  assert(
    atSeven.every((t) => t.appointmentStartsAt !== appt2000),
    "8pm appointment must be filtered at 7pm"
  )
  const atEight = filterActiveQueueTickets(tickets, at2000)
  assert(atEight.length === 3, `expected 3 tickets at 20:00, got ${atEight.length}`)
})

test("9. called/ongoing stay visible even if startsAt were in the future", () => {
  assert(
    isTicketEligibleForActiveQueue(
      { appointmentStartsAt: apptTomorrow2000, status: "ongoing" },
      at2000
    ),
    "ongoing should remain visible"
  )
})

test("10. manilaPreferredStartsAtIso builds Asia/Manila instant", () => {
  const iso = manilaPreferredStartsAtIso(today, "20:00")
  assert(iso != null, "iso required")
  assert(iso === appt2000, `expected ${appt2000}, got ${iso}`)
})

test("11. timezone: UTC evening before Manila 20:00 must stay ineligible", () => {
  // 20:00 Manila = 12:00 UTC. 11:59 UTC is still before.
  const beforeUtc = new Date("2026-10-15T11:59:00.000Z")
  assert(
    !isAppointmentEligibleForQueue(appt2000, beforeUtc),
    "must not become eligible early due to UTC clock"
  )
  const atUtc = new Date("2026-10-15T12:00:00.000Z")
  assert(
    isAppointmentEligibleForQueue(appt2000, atUtc),
    "eligible exactly at Manila 20:00 / UTC 12:00"
  )
})

test("12. re-filter is idempotent (no duplicate side effects)", () => {
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
