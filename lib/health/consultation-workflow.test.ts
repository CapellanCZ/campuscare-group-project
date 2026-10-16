/**
 * Run: npx --yes tsx lib/health/consultation-workflow.test.ts
 */
import {
  parseConsultationProviderType,
  resolveConsultationProviderType,
  resolveProviderTypeFromBookingBody,
} from "./consultation-workflow"

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

test("parses exact and case variants", () => {
  assert(parseConsultationProviderType("dentist") === "dentist", "dentist")
  assert(parseConsultationProviderType("Dentist") === "dentist", "Dentist")
  assert(parseConsultationProviderType("PHYSICIAN") === "physician", "PHYSICIAN")
})

test("parses aliases", () => {
  assert(parseConsultationProviderType("dental") === "dentist", "dental")
  assert(
    parseConsultationProviderType("Dental consultation") === "dentist",
    "Dental consultation"
  )
  assert(parseConsultationProviderType("doctor") === "physician", "doctor")
})

test("booking body prefers specialty over defaulted providerType", () => {
  const resolved = resolveProviderTypeFromBookingBody({
    providerType: "physician",
    specialty: "dentist",
  })
  assert(resolved === "dentist", `got ${resolved}`)
})

test("booking body accepts provider_type snake_case", () => {
  assert(
    resolveProviderTypeFromBookingBody({ provider_type: "dentist" }) ===
      "dentist",
    "provider_type"
  )
})

test("resolve falls back to physician", () => {
  assert(resolveConsultationProviderType(null, undefined, "") === "physician", "fallback")
})

console.log(`\n${passed} passed`)
