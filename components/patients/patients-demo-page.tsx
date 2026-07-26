"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  DemoPageHeader,
  DemoStatGrid,
  demoToast,
} from "@/components/demo/demo-page"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { demoPatients, demoPatientStats } from "@/lib/demo/fixtures"

export function PatientsDemoPage({ access }: { access: StaffAccess }) {
  const [query, setQuery] = useState("")
  const canEdit = can(access.designation, "patients.edit_information")
  const canUpdateMedical = can(access.designation, "patients.update_medical")
  const canViewHistory = can(
    access.designation,
    "patients.view_consultation_history"
  )
  const canViewDocs = can(access.designation, "patients.view_medical_documents")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return demoPatients
    return demoPatients.filter(
      (row) =>
        row.fullName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.course.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Patient Records"
        description="Search student patients and open clinical profiles"
        designation={access.designation}
      />

      {can(access.designation, "patients.summary_cards") ? (
        <DemoStatGrid stats={demoPatientStats} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Patients</CardTitle>
          {can(access.designation, "patients.search") ? (
            <Input
              className="sm:w-72"
              placeholder="Search name, student ID, or course"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Blood / allergies</TableHead>
                <TableHead>Last visit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.studentId} · {row.yearLevel}
                    </p>
                  </TableCell>
                  <TableCell>{row.course}</TableCell>
                  <TableCell>
                    <p>{row.bloodType}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.allergies}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{row.lastVisit}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.consultationsCount} consults · {row.documentsCount}{" "}
                      docs
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {can(access.designation, "patients.view_profile") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast(`Open profile · ${row.fullName}`))
                          }
                        >
                          Profile
                        </Button>
                      ) : null}
                      {canViewHistory ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast("View consultation history"))
                          }
                        >
                          History
                        </Button>
                      ) : null}
                      {canViewDocs ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast("View medical documents"))
                          }
                        >
                          Documents
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button
                          size="xs"
                          onClick={() =>
                            toast.message(demoToast("Edit patient information"))
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canUpdateMedical ? (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() =>
                            toast.message(demoToast("Update medical information"))
                          }
                        >
                          Medical
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
