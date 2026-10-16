/**
 * Run: npx --yes tsx lib/medical-documents/resolve-document-type.test.ts
 */
import { resolveMedicalDocumentType } from "./resolve-document-type"

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

test("prefers Prescription certificate_type over defaulted document_type", () => {
  const type = resolveMedicalDocumentType({
    documentType: "medical_certification",
    certificateType: "Prescription",
    payload: { medications: [{ name: "Paracetamol" }] },
  })
  assert(type === "prescription", `got ${type}`)
})

test("uses document_type when it is already prescription", () => {
  const type = resolveMedicalDocumentType({
    documentType: "prescription",
    certificateType: "Prescription",
    payload: {},
  })
  assert(type === "prescription", `got ${type}`)
})

test("infers prescription from payload when column is wrong", () => {
  const type = resolveMedicalDocumentType({
    documentType: "medical_certification",
    certificateType: "Medical certificate",
    payload: {
      diagnosticRequests: { catalog: "physician", selectedIds: ["cbc"] },
    },
  })
  assert(type === "prescription", `got ${type}`)
})

test("keeps medical certification when signals agree", () => {
  const type = resolveMedicalDocumentType({
    documentType: "medical_certification",
    certificateType: "Medical certificate",
    payload: { purposeCategory: "internship_ojt", certificationStatus: "fit" },
  })
  assert(type === "medical_certification", `got ${type}`)
})

console.log(`\n${passed} passed`)
