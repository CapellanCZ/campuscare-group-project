/**
 * Run: npx --yes tsx lib/medical-documents/prescription-validation.test.ts
 */
import {
  sanitizePrescriptionPayload,
  validatePrescriptionPayload,
} from "./prescription-validation"

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

test("allows lab-only prescription", () => {
  const error = validatePrescriptionPayload({
    medications: [],
    diagnosticRequests: {
      catalog: "physician",
      selectedIds: ["cbc"],
      othersText: "",
    },
  })
  assert(error === null, `expected null, got ${error}`)
})

test("allows medication-only prescription", () => {
  const error = validatePrescriptionPayload({
    medications: [{ name: "Paracetamol", strength: "500" }],
    diagnosticRequests: {
      catalog: "physician",
      selectedIds: [],
      othersText: "",
    },
  })
  assert(error === null, `expected null, got ${error}`)
})

test("rejects empty prescription", () => {
  const error = validatePrescriptionPayload({
    medications: [],
    diagnosticRequests: {
      catalog: "physician",
      selectedIds: [],
      othersText: "",
    },
  })
  assert(error != null, "expected an error")
})

test("requires others text when others selected", () => {
  const error = validatePrescriptionPayload({
    medications: [],
    diagnosticRequests: {
      catalog: "physician",
      selectedIds: ["others"],
      othersText: "  ",
    },
  })
  assert(error != null && /custom/i.test(error), `got ${error}`)
})

test("sanitize drops blank medication rows", () => {
  const next = sanitizePrescriptionPayload({
    medications: [
      { name: "", strength: "500" },
      { name: "Amoxicillin", quantity: "21" },
    ],
  })
  assert(next.medications.length === 1, "expected one med")
  assert(next.medications[0]?.name === "Amoxicillin", "wrong med kept")
})

console.log(`\n${passed} passed`)
