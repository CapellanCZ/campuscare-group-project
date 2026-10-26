"use client"

import Link from "next/link"
import {
  IconCheck,
  IconEye,
  IconFileText,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"

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
  // Keep one header label so Today / Upcoming / Earlier columns stay aligned.
  const dateLabel = "Date"

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
            <TableRow>
              <TableHead className={cn("pl-6", isDentist && "px-4")}>
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
              <TableHead
                className={cn("pr-6 text-right", isDentist && "px-4")}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className={cn("pl-6", isDentist && "px-4")}>
                  <div className="flex min-w-0 items-start gap-1.5">
                    <p className="min-w-0 flex-1 truncate font-medium">
                      {row.patient.fullName}
                    </p>
                    {!isClinician ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-7 shrink-0 text-muted-foreground"
                        aria-label={`View ${row.patient.fullName}`}
                        title="View details"
                        onClick={() => onView(row)}
                      >
                        <IconEye className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
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
                <TableCell className={cn("pr-6", isDentist && "px-4")}>
                  <div className="flex flex-wrap justify-end gap-1">
                    {isClinician ? (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          className="size-7"
                          aria-label="Open consultation"
                          title="Open"
                          render={
                            <Link
                              href={`/${rolePath}/consultation/${row.id}`}
                            />
                          }
                          nativeButton={false}
                        >
                          <IconFileText className="size-3.5" aria-hidden />
                        </Button>
                        {row.status !== "completed" ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="secondary"
                            className="size-7"
                            aria-label="Complete"
                            title="Complete"
                            onClick={() => onComplete(row)}
                          >
                            <IconCheck className="size-3.5" aria-hidden />
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {can(d, "consultations.record_initial_assessment") &&
                        !row.assessment ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            className="size-7"
                            aria-label="Assess"
                            title="Assess"
                            onClick={() => onEdit(row)}
                          >
                            <IconPencil className="size-3.5" aria-hidden />
                          </Button>
                        ) : null}
                        {(can(d, "consultations.create_record") ||
                          can(d, "consultations.record_diagnosis") ||
                          can(d, "consultations.record_treatment") ||
                          can(d, "consultations.record_prescription")) &&
                        row.status !== "completed" ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            className="size-7"
                            aria-label="Edit record"
                            title="Edit"
                            onClick={() => onEdit(row)}
                          >
                            <IconPencil className="size-3.5" aria-hidden />
                          </Button>
                        ) : null}
                        {can(d, "consultations.complete") &&
                        row.status !== "completed" ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="secondary"
                            className="size-7"
                            aria-label="Complete"
                            title="Complete"
                            onClick={() => onComplete(row)}
                          >
                            <IconCheck className="size-3.5" aria-hidden />
                          </Button>
                        ) : null}
                        {can(d, "consultations.generate_certificate") ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            className="size-7"
                            aria-label="Medical certificate"
                            title="Certificate"
                            onClick={() =>
                              appToast.info({
                                title: "Medical Certificate",
                                description:
                                  "Open Medical Certificates to generate a certificate for this patient.",
                              })
                            }
                          >
                            <IconFileText className="size-3.5" aria-hidden />
                          </Button>
                        ) : null}
                        {can(d, "consultations.update_record") ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="destructive"
                            className="size-7"
                            aria-label="Delete"
                            title="Delete"
                            onClick={() => onDelete(row)}
                          >
                            <IconTrash className="size-3.5" aria-hidden />
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
