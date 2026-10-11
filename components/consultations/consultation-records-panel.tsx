"use client"

import Link from "next/link"

import {
  ConsultationListCard,
  formatConsultationScheduleDate,
  formatConsultationTableDate,
  providerLabel,
  serviceLabel,
} from "@/components/consultations/consultation-list-card"
import { ConsultationStatusBadge } from "@/components/consultations/consultation-status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { appToast } from "@/lib/feedback/app-toast"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { cn } from "@/lib/utils"
import type { Consultation } from "@/types/consultation"

export function ConsultationRecordsPanel({
  rows,
  emphasizeDate = false,
  isDentist,
  isClinician,
  rolePath,
  access,
  onView,
  onComplete,
  onEdit,
  onDelete,
}: {
  rows: Consultation[]
  emphasizeDate?: boolean
  isDentist: boolean
  isClinician: boolean
  rolePath: string
  access: StaffAccess
  onView: (row: Consultation) => void
  onComplete: (row: Consultation) => void
  onEdit: (row: Consultation) => void
  onDelete: (row: Consultation) => void
}) {
  const d = access.designation
  const dateLabel = emphasizeDate ? "Consultation date" : "Date"

  return (
    <>
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {rows.map((row) => (
          <ConsultationListCard
            key={row.id}
            row={row}
            emphasizeDate={emphasizeDate}
            clinicianHref={
              isClinician ? `/${rolePath}/consultation/${row.id}` : undefined
            }
            onView={() => onView(row)}
            showComplete={isClinician && row.status !== "completed"}
            onComplete={() => onComplete(row)}
          />
        ))}
      </div>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className={isDentist ? "h-14" : undefined}>
              <TableHead className={isDentist ? "px-4" : undefined}>
                Patient
              </TableHead>
              <TableHead
                className={cn("hidden lg:table-cell", isDentist && "px-4")}
              >
                Patient ID
              </TableHead>
              <TableHead
                className={cn("hidden sm:table-cell", isDentist && "px-4")}
              >
                Service
              </TableHead>
              <TableHead
                className={cn("hidden sm:table-cell", isDentist && "px-4")}
              >
                Provider
              </TableHead>
              <TableHead
                className={cn(
                  emphasizeDate ? "table-cell" : "hidden md:table-cell",
                  isDentist && "px-4"
                )}
              >
                {dateLabel}
              </TableHead>
              <TableHead
                className={cn("hidden lg:table-cell", isDentist && "px-4")}
              >
                Queue #
              </TableHead>
              <TableHead className={isDentist ? "px-4" : undefined}>
                Status
              </TableHead>
              <TableHead className={cn("text-right", isDentist && "px-4")}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={isDentist ? "h-14" : undefined}
              >
                <TableCell className={isDentist ? "px-4" : undefined}>
                  <p className="font-medium">{row.patient.fullName}</p>
                </TableCell>
                <TableCell
                  className={cn("hidden lg:table-cell", isDentist && "px-4")}
                >
                  {row.patient.studentId || "—"}
                </TableCell>
                <TableCell
                  className={cn("hidden sm:table-cell", isDentist && "px-4")}
                >
                  {serviceLabel(row)}
                </TableCell>
                <TableCell
                  className={cn(
                    "hidden sm:table-cell capitalize",
                    isDentist && "px-4"
                  )}
                >
                  {providerLabel(row)}
                </TableCell>
                <TableCell
                  className={cn(
                    emphasizeDate ? "table-cell" : "hidden md:table-cell",
                    isDentist && "px-4",
                    emphasizeDate && "font-medium text-foreground"
                  )}
                >
                  {emphasizeDate
                    ? formatConsultationScheduleDate(row.consultationDate)
                    : formatConsultationTableDate(row.consultationDate)}
                </TableCell>
                <TableCell
                  className={cn("hidden lg:table-cell", isDentist && "px-4")}
                >
                  {row.queueNumber ?? "—"}
                </TableCell>
                <TableCell className={isDentist ? "px-4" : undefined}>
                  <ConsultationStatusBadge status={row.status} />
                </TableCell>
                <TableCell className={isDentist ? "px-4" : undefined}>
                  <div className="flex flex-wrap justify-end gap-1">
                    {isClinician ? (
                      <>
                        <Button
                          type="button"
                          size="xs"
                          render={
                            <Link
                              href={`/${rolePath}/consultation/${row.id}`}
                            />
                          }
                          nativeButton={false}
                        >
                          Open
                        </Button>
                        {row.status !== "completed" ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => onComplete(row)}
                          >
                            Complete
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => onView(row)}
                        >
                          View
                        </Button>
                        {can(d, "consultations.view_patient") ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              appToast.info({
                                title: "Patient",
                                description: `${row.patient.fullName} · ${row.patient.studentId}`,
                              })
                            }
                          >
                            Patient
                          </Button>
                        ) : null}
                        {can(d, "consultations.record_initial_assessment") &&
                        !row.assessment ? (
                          <Button
                            type="button"
                            size="xs"
                            onClick={() => onEdit(row)}
                          >
                            Assess
                          </Button>
                        ) : null}
                        {can(d, "consultations.create_record") &&
                        row.status !== "completed" ? (
                          <Button
                            type="button"
                            size="xs"
                            onClick={() => onEdit(row)}
                          >
                            Chart
                          </Button>
                        ) : null}
                        {can(d, "consultations.record_diagnosis") ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onEdit(row)}
                          >
                            Dx
                          </Button>
                        ) : null}
                        {can(d, "consultations.record_treatment") ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onEdit(row)}
                          >
                            Tx
                          </Button>
                        ) : null}
                        {can(d, "consultations.record_prescription") ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onEdit(row)}
                          >
                            Rx
                          </Button>
                        ) : null}
                        {can(d, "consultations.complete") &&
                        row.status !== "completed" ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => onComplete(row)}
                          >
                            Complete
                          </Button>
                        ) : null}
                        {can(d, "consultations.generate_certificate") ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              appToast.info({
                                title: "Medical Certificate",
                                description:
                                  "Open Medical Certificates to generate a certificate for this patient.",
                              })
                            }
                          >
                            Certificate
                          </Button>
                        ) : null}
                        {can(d, "consultations.update_record") ? (
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() => onDelete(row)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
