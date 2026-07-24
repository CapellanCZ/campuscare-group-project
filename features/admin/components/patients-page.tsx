import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { IconPlus } from "@tabler/icons-react"

import {
  createPatient,
  deletePatient,
  importPatientsFromExcel,
  listPatients,
  updatePatient,
  type PatientAffiliation,
} from "@/features/admin/actions/patients"
import { BulkExcelImportCard } from "@/features/admin/components/bulk-excel-import-card"
import { PageHeader } from "@/features/common/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SearchParamValue = string | string[] | undefined

type PatientsPageProps = {
  searchParams?: Record<string, SearchParamValue>
}

const BASE = "/admin/user-management/patients"

function firstValue(value: SearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

function normalizeAffiliationFilter(
  value: string
): PatientAffiliation | "all" {
  return value === "student" || value === "faculty" ? value : "all"
}

function buildHref(parts: {
  query: string
  affiliation: string
  notice?: string
  warning?: string
  error?: string
}) {
  const params = new URLSearchParams()
  if (parts.query) params.set("q", parts.query)
  if (parts.affiliation !== "all") params.set("affiliation", parts.affiliation)
  if (parts.notice) params.set("notice", parts.notice)
  if (parts.warning) params.set("warning", parts.warning)
  if (parts.error) params.set("error", parts.error)
  const qs = params.toString()
  return qs ? `${BASE}?${qs}` : BASE
}

export async function PatientsPage({ searchParams = {} }: PatientsPageProps) {
  const query = firstValue(searchParams.q).trim()
  const affiliation = normalizeAffiliationFilter(
    firstValue(searchParams.affiliation)
  )
  const notice = firstValue(searchParams.notice)
  const warning = firstValue(searchParams.warning)
  const error = firstValue(searchParams.error)

  const result = await listPatients({ query, affiliation })

  async function createAction(formData: FormData) {
    "use server"
    const q = String(formData.get("currentQuery") ?? "")
    const a = String(formData.get("currentAffiliation") ?? "all")
    const outcome = await createPatient({
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      studentId: String(formData.get("studentId") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      sex: String(formData.get("sex") ?? ""),
      affiliation: String(formData.get("affiliation") ?? ""),
    })
    revalidatePath(BASE)
    redirect(
      buildHref({
        query: q,
        affiliation: a,
        notice: outcome.ok ? outcome.message : undefined,
        error: outcome.ok ? undefined : outcome.error,
      })
    )
  }

  async function updateAction(formData: FormData) {
    "use server"
    const q = String(formData.get("currentQuery") ?? "")
    const a = String(formData.get("currentAffiliation") ?? "all")
    const outcome = await updatePatient({
      patientId: String(formData.get("patientId") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      studentId: String(formData.get("studentId") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      sex: String(formData.get("sex") ?? ""),
      affiliation: String(formData.get("affiliation") ?? ""),
    })
    revalidatePath(BASE)
    redirect(
      buildHref({
        query: q,
        affiliation: a,
        notice: outcome.ok ? outcome.message : undefined,
        error: outcome.ok ? undefined : outcome.error,
      })
    )
  }

  async function deleteAction(formData: FormData) {
    "use server"
    const q = String(formData.get("currentQuery") ?? "")
    const a = String(formData.get("currentAffiliation") ?? "all")
    const outcome = await deletePatient({
      patientId: String(formData.get("patientId") ?? ""),
    })
    revalidatePath(BASE)
    redirect(
      buildHref({
        query: q,
        affiliation: a,
        notice: outcome.ok ? outcome.message : undefined,
        error: outcome.ok ? undefined : outcome.error,
      })
    )
  }

  async function importAction(formData: FormData) {
    "use server"
    const outcome = await importPatientsFromExcel(formData)
    revalidatePath(BASE)
    redirect(
      buildHref({
        query,
        affiliation,
        notice: outcome.ok ? outcome.message : undefined,
        warning: outcome.ok ? outcome.warning : undefined,
        error: outcome.ok ? undefined : outcome.error,
      })
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Patients"
        subtitle="Students and faculty"
        description="Manage campus patients (students and faculty). Bulk import from Excel when onboarding rosters."
      />

      {(notice || warning || error) && (
        <div className="space-y-2" role="status">
          {notice ? (
            <p className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm">
              {notice}
            </p>
          ) : null}
          {warning ? (
            <p className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {warning}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {!result.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {result.error}
        </p>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <IconPlus className="size-4" aria-hidden />
                  Add patient
                </CardTitle>
                <CardDescription>
                  Students and faculty of the campus clinic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="currentQuery" value={query} />
                  <input
                    type="hidden"
                    name="currentAffiliation"
                    value={affiliation}
                  />
                  <Input
                    name="fullName"
                    placeholder="Full name"
                    required
                    className="sm:col-span-2"
                  />
                  <select
                    name="affiliation"
                    required
                    defaultValue="student"
                    className="h-9 rounded-4xl border border-border bg-background px-3 text-sm sm:col-span-2"
                    aria-label="Affiliation"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                  <Input name="email" type="email" placeholder="Email" />
                  <Input name="studentId" placeholder="ID number" />
                  <Input name="phone" placeholder="Phone" />
                  <Input name="dateOfBirth" type="date" aria-label="Date of birth" />
                  <Input name="sex" placeholder="Sex" className="sm:col-span-2" />
                  <Button type="submit" className="sm:col-span-2">
                    Create patient
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bulk import</CardTitle>
                <CardDescription>
                  Import students and faculty from Excel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkExcelImportCard
                  title="Import patients"
                  description="Columns: full_name, email, student_id, phone, date_of_birth, sex, affiliation (student|faculty)"
                  templateFilename="patients-import-template.xlsx"
                  templateHeaders={[
                    "full_name",
                    "email",
                    "student_id",
                    "phone",
                    "date_of_birth",
                    "sex",
                    "affiliation",
                  ]}
                  templateSampleRows={[
                    [
                      "Juan Dela Cruz",
                      "juan@example.com",
                      "2024-001",
                      "09171234567",
                      "2004-05-12",
                      "male",
                      "student",
                    ],
                    [
                      "Maria Santos",
                      "maria.santos@example.com",
                      "FAC-12",
                      "09179876543",
                      "1988-02-01",
                      "female",
                      "faculty",
                    ],
                  ]}
                  action={importAction}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-base">Patient directory</CardTitle>
                <CardDescription>
                  {result.patients.length} patient
                  {result.patients.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
              <form className="flex flex-wrap gap-2" method="get">
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Search patients"
                  className="w-48"
                />
                <select
                  name="affiliation"
                  defaultValue={affiliation}
                  className="h-9 rounded-4xl border border-border bg-background px-3 text-sm"
                  aria-label="Filter by affiliation"
                >
                  <option value="all">All</option>
                  <option value="student">Students</option>
                  <option value="faculty">Faculty</option>
                </select>
                <Button type="submit" variant="outline">
                  Filter
                </Button>
              </form>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No patients match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="min-w-56 align-top">
                          <form action={updateAction} className="grid gap-2">
                            <input
                              type="hidden"
                              name="patientId"
                              value={patient.id}
                            />
                            <input type="hidden" name="currentQuery" value={query} />
                            <input
                              type="hidden"
                              name="currentAffiliation"
                              value={affiliation}
                            />
                            <Input
                              name="fullName"
                              defaultValue={patient.fullName}
                              required
                            />
                            <select
                              name="affiliation"
                              defaultValue={patient.affiliation ?? "student"}
                              className="h-9 rounded-4xl border border-border bg-background px-3 text-sm"
                              aria-label="Affiliation"
                            >
                              <option value="student">Student</option>
                              <option value="faculty">Faculty</option>
                            </select>
                            <Input
                              name="studentId"
                              defaultValue={patient.studentId ?? ""}
                              placeholder="ID number"
                            />
                            <Input
                              name="dateOfBirth"
                              type="date"
                              defaultValue={patient.dateOfBirth ?? ""}
                            />
                            <Input
                              name="sex"
                              defaultValue={patient.sex ?? ""}
                              placeholder="Sex"
                            />
                            <Input
                              name="email"
                              type="email"
                              defaultValue={patient.email ?? ""}
                              placeholder="Email"
                            />
                            <Input
                              name="phone"
                              defaultValue={patient.phone ?? ""}
                              placeholder="Phone"
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Save
                            </Button>
                          </form>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="outline" className="capitalize">
                            {patient.affiliation ?? "student"}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          <div className="space-y-1">
                            <p>{patient.email ?? "No email"}</p>
                            <p>{patient.phone ?? "No phone"}</p>
                            <p>{patient.studentId ?? "No ID"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <form action={deleteAction}>
                            <input
                              type="hidden"
                              name="patientId"
                              value={patient.id}
                            />
                            <input type="hidden" name="currentQuery" value={query} />
                            <input
                              type="hidden"
                              name="currentAffiliation"
                              value={affiliation}
                            />
                            <Button type="submit" size="sm" variant="ghost">
                              Delete
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
