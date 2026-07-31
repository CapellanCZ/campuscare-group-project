"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import {
  DemoPageHeader,
  DemoStatGrid,
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
  demoConsultationRequests,
  demoRequestStats,
} from "@/lib/demo/fixtures"
import type {
  ConsultationRequestStatus,
  DemoConsultationRequest,
} from "@/lib/demo/types"
import { actionApproveConsultationRequest } from "@/lib/health/queue-server-actions"

const statusVariant: Record<
  ConsultationRequestStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  declined: "destructive",
  rescheduled: "outline",
}

export function RequestsDemoPage({ access }: { access: StaffAccess }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [rowsState, setRowsState] = useState<DemoConsultationRequest[]>(
    demoConsultationRequests
  )
  const [pending, startTransition] = useTransition()
  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")
  const queueHref = `/${access.designation}/queue`

  const rows = useMemo(() => {
    return rowsState.filter((row) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        row.patientName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q)
      const matchesStatus = status === "all" || row.status === status
      return matchesQuery && matchesStatus
    })
  }, [query, status, rowsState])

  function markLocalStatus(id: string, next: ConsultationRequestStatus) {
    setRowsState((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status: next } : row))
    )
  }

  function handleApprove(row: DemoConsultationRequest) {
    startTransition(async () => {
      const result = await actionApproveConsultationRequest({
        requestId: row.id,
        patientName: row.patientName,
        studentId: row.studentId,
        service: row.service,
        reason: row.reason,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      markLocalStatus(row.id, "approved")
      toast.success(result.message ?? "Request approved and queued.")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="Consultation Requests"
        description="Nurse triage only — approve to queue the patient for check-in and intake, then assign specialty for the doctor list."
        designation={access.designation}
        actions={
          canApprove ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={queueHref} />}
              nativeButton={false}
            >
              Open queue
            </Button>
          ) : null
        }
      />

      {can(access.designation, "requests.summary_cards") ? (
        <DemoStatGrid stats={demoRequestStats} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Request queue</CardTitle>
          {can(access.designation, "requests.search_filters") ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                className="sm:w-64"
                placeholder="Search patient, ID, or service"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Filter by status"
                className="h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Preferred</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{row.patientName}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {row.studentId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{row.service}</TableCell>
                  <TableCell className="text-sm">
                    {row.preferredDate} {row.preferredTime}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status]}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {canViewDetails ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            toast.message(
                              `${row.reason} · submitted ${row.submittedAt}`
                            )
                          }
                        >
                          View
                        </Button>
                      ) : null}
                      {canApprove && row.status === "pending" ? (
                        <Button
                          size="xs"
                          disabled={pending}
                          onClick={() => handleApprove(row)}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {canReschedule && row.status === "pending" ? (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            markLocalStatus(row.id, "rescheduled")
                            toast.message("Request marked rescheduled.")
                          }}
                        >
                          Reschedule
                        </Button>
                      ) : null}
                      {canDecline && row.status === "pending" ? (
                        <Button
                          size="xs"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => {
                            markLocalStatus(row.id, "declined")
                            toast.error("Request declined.")
                          }}
                        >
                          Decline
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
