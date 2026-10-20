import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  DOUBLE_BOOKING_CODE,
  DoubleBookingError,
  doubleBookingUserMessage,
  isDoubleBookingError,
} from "./appointment-double-booking"

describe("appointment-double-booking", () => {
  it("returns clear patient-facing copy per status", () => {
    assert.match(doubleBookingUserMessage("pending"), /pending/i)
    assert.match(doubleBookingUserMessage("waitlisted"), /waitlist/i)
    assert.match(doubleBookingUserMessage("confirmed"), /active/i)
  })

  it("tags DoubleBookingError for API mapping", () => {
    const err = new DoubleBookingError({
      id: "appt-1",
      status: "pending",
      startsAt: new Date().toISOString(),
      patientId: "pat-1",
    })
    assert.equal(err.code, DOUBLE_BOOKING_CODE)
    assert.equal(err.existingAppointmentId, "appt-1")
    assert.equal(isDoubleBookingError(err), true)
  })
})
