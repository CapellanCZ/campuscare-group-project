import type { NurseVisitVitals } from "@/features/physician/types-visit"
import type { PhysicalExam } from "@/types/patientRecord"

/** Overlay nurse intake vitals onto physical exam (nurse fields stay authoritative). */
export function mergeNurseVitalsIntoExam(
  exam: PhysicalExam,
  vitals: NurseVisitVitals
): PhysicalExam {
  return {
    ...exam,
    bloodPressure: vitals.bloodPressure || exam.bloodPressure,
    pulseRate: vitals.pulseRate || exam.pulseRate,
    temperature: vitals.temperature || exam.temperature,
    weight: vitals.weight || exam.weight,
    height: vitals.height || exam.height,
    o2: vitals.o2 || exam.o2,
  }
}
