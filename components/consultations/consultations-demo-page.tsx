"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  DemoPageHeader,
  DemoStatGrid,
  demoToast,
} from "@/components/demo/demo-page"
import { Badge } from "@/components/ui/badge"
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
import {
  demoConsultations,
  demoConsultationStats,
} from "@/lib/demo/fixtures"
import type { ConsultationStatus } from "@/lib/demo/types"

const statusLabel: Record<ConsultationStatus, string> = {
  awaiting_assessment: "Awaiting assessment",
  in_progress: "In progress",
  completed: "Completed",
}

export function ConsultationsDemoPage({ access }: { access: StaffAccess }) {
  const [query, setQuery] = useState("")
  const d = access.designation

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return demoConsultations
    return demoConsultations.filter(
      (row) =>
        row.patientName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.chiefComplaint.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Consultations"
        description="Triage assessments and clinical charting"
        designation={d}
      />

      {can(d, "consultations.cards") ? (
        <DemoStatGrid stats={demoConsultationStats} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Today&apos;s consultations</CardTitle>
          <Input
            className="sm:w-72"
            placeholder="Search patient or complaint"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.studentId} · {row.chiefComplaint}
                    </p>
                  </TableCell>
                  <TableCell className="capitalize">{row.station}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabel[row.status]}</Badge>
                  </TableCell>
                  <TableCell>{row.provider}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {can(d, "consultations.view_patient") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast("View patient information"))
                          }
                        >
                          Patient
                        </Button>
                      ) : null}
                      {can(d, "consultations.record_initial_assessment") &&
                      !row.hasAssessment ? (
                        <Button
                          size="xs"
                          onClick={() =>
                            toast.success(demoToast("Record initial assessment"))
                          }
                        >
                          Assess
                        </Button>
                      ) : null}
                      {can(d, "consultations.create_record") &&
                      row.status !== "completed" ? (
                        <Button
                          size="xs"
                          onClick={() =>
                            toast.success(demoToast("Create / update consultation"))
                          }
                        >
                          Chart
                        </Button>
                      ) : null}
                      {can(d, "consultations.record_diagnosis") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.message(demoToast("Record diagnosis"))
                          }
                        >
                          Dx
                        </Button>
                      ) : null}
                      {can(d, "consultations.record_treatment") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.message(demoToast("Record treatment"))
                          }
                        >
                          Tx
                        </Button>
                      ) : null}
                      {can(d, "consultations.record_prescription") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.message(demoToast("Record prescription"))
                          }
                        >
                          Rx
                        </Button>
                      ) : null}
                      {can(d, "consultations.complete") &&
                      row.status !== "completed" ? (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() =>
                            toast.success(demoToast("Complete consultation"))
                          }
                        >
                          Complete
                        </Button>
                      ) : null}
                      {can(d, "consultations.generate_certificate") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.success(demoToast("Generate medical certificate"))
                          }
                        >
                          Certificate
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
