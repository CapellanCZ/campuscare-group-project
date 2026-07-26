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
  demoConsultationRequests,
  demoRequestStats,
} from "@/lib/demo/fixtures"
import type { ConsultationRequestStatus } from "@/lib/demo/types"

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
  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")

  const rows = useMemo(() => {
    return demoConsultationRequests.filter((row) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        row.patientName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q)
      const matchesStatus = status === "all" || row.status === status
      return matchesQuery && matchesStatus
    })
  }, [query, status])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Consultation Requests"
        description="Review and process incoming appointment requests"
        designation={access.designation}
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
                      <p className="truncate font-medium">{row.patientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.studentId} · {row.reason}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{row.service}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {row.preferredDate} · {row.preferredTime}
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
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast(`View details for ${row.patientName}`))
                          }
                        >
                          View
                        </Button>
                      ) : null}
                      {canApprove && row.status === "pending" ? (
                        <Button
                          size="xs"
                          onClick={() => toast.success(demoToast("Approve request"))}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {canReschedule && row.status === "pending" ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => toast.message(demoToast("Reschedule request"))}
                        >
                          Reschedule
                        </Button>
                      ) : null}
                      {canDecline && row.status === "pending" ? (
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => toast.error(demoToast("Decline request"))}
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
