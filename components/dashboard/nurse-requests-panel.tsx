"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { ModuleSnapshot } from "@/components/dashboard/module-snapshot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { declineConsultationRequestAction } from "@/features/requests/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { actionApproveConsultationRequest } from "@/lib/health/queue-server-actions"

const REQUESTS_HREF = "/nurse/consultation-requests"
const DASHBOARD_LIMIT = 3

export function NurseRequestsPanel({
  access,
  summary,
}: {
  access: StaffAccess
  summary: RoleDashboardSummary
}) {
  const router = useRouter()
  const canTriage = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const [pendingApprove, startApprove] = useTransition()
  const [pendingDecline, startDecline] = useTransition()

  const rows = summary.requests.recent.slice(0, DASHBOARD_LIMIT)

  return (
    <ModuleSnapshot
      title="Consultation requests"
      description="Pending requests waiting for triage."
      href={REQUESTS_HREF}
      linkLabel="View all"
      badge={summary.requests.pendingCount}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((req) => (
            <li
              key={req.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{req.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {req.service} · {req.preferredDate} {req.preferredTime}
                  {req.studentId ? ` · ${req.studentId}` : ""}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {req.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  render={
                    <Link
                      href={`${REQUESTS_HREF}?id=${encodeURIComponent(req.id)}`}
                    />
                  }
                  nativeButton={false}
                >
                  View
                </Button>
                {canTriage ? (
                  <Button
                    size="sm"
                    disabled={pendingApprove || pendingDecline}
                    onClick={() =>
                      startApprove(async () => {
                        const result = await actionApproveConsultationRequest({
                          requestId: req.id,
                          patientName: req.patientName,
                          studentId: req.studentId,
                          service: req.service,
                          reason: `${req.service} request`,
                        })
                        if (!result.ok) {
                          toast.error(result.error)
                          return
                        }
                        toast.success(
                          result.message ??
                            "Approved — patient queued for nurse intake."
                        )
                        router.refresh()
                      })
                    }
                  >
                    Approve
                  </Button>
                ) : null}
                {canDecline ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingApprove || pendingDecline}
                    onClick={() =>
                      startDecline(async () => {
                        const result = await declineConsultationRequestAction({
                          id: req.id,
                          reason: "Declined during nurse dashboard triage.",
                        })
                        if (!result.ok) {
                          toast.error(result.error)
                          return
                        }
                        toast.success("Request declined.")
                        router.refresh()
                      })
                    }
                  >
                    Decline
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModuleSnapshot>
  )
}
