import type { PhysicalExam } from "@/types/patientRecord"

export type NurseVisitVitals = Pick<
  PhysicalExam,
  | "bloodPressure"
  | "pulseRate"
  | "temperature"
  | "weight"
  | "height"
  | "o2"
>
