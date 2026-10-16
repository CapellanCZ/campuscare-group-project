/**
 * Run: npx --yes tsx lib/health/clinic-datetime.test.ts
 */
import {
  formatManilaDateTime,
  isoToManilaDatetimeLocal,
  manilaDateTimeToIso,
  manilaDatetimeLocalToIso,
  manilaPartsFromIso,
} from "./clinic-datetime"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
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

test("stores 9:00 PM Manila as 13:00 UTC", () => {
  const iso = manilaDateTimeToIso("2026-10-16", "21:00")
  assert(iso === "2026-10-16T13:00:00.000Z", `got ${iso}`)
})

test("round-trips 9 PM Manila through parts", () => {
  const iso = manilaDateTimeToIso("2026-10-16", "21:00")
  const parts = manilaPartsFromIso(iso)
  assert(parts.date === "2026-10-16", `date ${parts.date}`)
  assert(parts.time === "21:00", `time ${parts.time}`)
})

test("datetime-local uses Manila wall clock not UTC slice", () => {
  const iso = "2026-10-16T13:00:00.000Z"
  assert(
    isoToManilaDatetimeLocal(iso) === "2026-10-16T21:00",
    `got ${isoToManilaDatetimeLocal(iso)}`
  )
  assert(iso.slice(0, 16) === "2026-10-16T13:00", "UTC slice is 13:00")
  assert(
    iso.slice(0, 16) !== "2026-10-16T21:00",
    "UTC slice must not equal Manila wall clock"
  )
})

test("parses datetime-local as Manila on save", () => {
  const iso = manilaDatetimeLocalToIso("2026-10-16T21:00")
  assert(iso === "2026-10-16T13:00:00.000Z", `got ${iso}`)
})

test("formats for display in Manila", () => {
  const label = formatManilaDateTime("2026-10-16T13:00:00.000Z")
  assert(/9:00|21:00/.test(label), `unexpected label: ${label}`)
})

console.log(`\n${passed} passed`)
