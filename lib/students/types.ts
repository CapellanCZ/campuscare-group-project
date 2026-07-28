export type EnrolledFamilyBackground = {
  guardianName: string | null
  relationship: string | null
  occupation: string | null
  address: string | null
  mobile: string | null
  email: string | null
}

export type EnrolledStudent = {
  studentId: string
  department: string | null
  course: string | null
  lastName: string
  firstName: string
  middleName: string | null
  suffix: string | null
  birthDate: string | null
  gender: string | null
  civilStatus: string | null
  religion: string | null
  mobile: string | null
  email: string | null
  presentAddress: string | null
  familyBackground: EnrolledFamilyBackground
}

export const NO_STUDENT_FOUND = "No student found"
