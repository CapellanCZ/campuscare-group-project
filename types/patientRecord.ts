export type PatientAffiliation = "student" | "faculty"

export type PatientRecord = {
  id: string
  fullName: string
  email: string | null
  studentId: string | null
  phone: string | null
  dateOfBirth: string | null
  sex: string | null
  affiliation: PatientAffiliation | null
  course: string | null
  yearLevel: string | null
  bloodType: string | null
  allergies: string | null
  lastVisit: string | null
  consultationsCount: number
  documentsCount: number
}

export type PatientRecordStats = {
  total: number
  visitedThisMonth: number
  flaggedAllergies: number
  documents: number
}

export type PatientRecordListParams = {
  query?: string
  page?: number
  pageSize?: number
  affiliation?: PatientAffiliation | "all"
}

export type PatientRecordListResult = {
  items: PatientRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type UpdatePatientRecordInput = {
  id: string
  fullName?: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  sex?: string | null
  bloodType?: string | null
  allergies?: string | null
  course?: string | null
  yearLevel?: string | null
}

export class PatientRecordServiceError extends Error {
  constructor(
    public code:
      | "validation"
      | "permission"
      | "not_found"
      | "offline"
      | "database",
    message: string
  ) {
    super(message)
    this.name = "PatientRecordServiceError"
  }
}
