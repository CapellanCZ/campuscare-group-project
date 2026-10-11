import { PatientsBinPage } from "@/components/patients/patients-bin-page"
import { requireStaffModule } from "@/lib/auth/require-module"
import { listArchivedDirectoryPatientRecords } from "@/lib/students/directory"
import {
  PatientRecordServiceError,
  type PatientRecordListResult,
} from "@/types/patientRecord"

export async function StaffPatientsBinPage() {
  const access = await requireStaffModule("patient_records")

  const emptyList: PatientRecordListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }

  let list = emptyList
  let initialError: string | null = null

  try {
    list = await listArchivedDirectoryPatientRecords({ page: 1, pageSize: 20 })
  } catch (error) {
    initialError =
      error instanceof PatientRecordServiceError
        ? error.message
        : "Could not load archived patient records. Please try again."
  }

  return (
    <PatientsBinPage
      access={access}
      initialList={list}
      initialError={initialError}
    />
  )
}
