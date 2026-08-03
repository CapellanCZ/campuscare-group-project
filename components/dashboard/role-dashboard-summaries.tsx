"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  ModuleSnapshot,
  SnapshotStatRow,
} from "@/components/dashboard/module-snapshot"
import { PanelCell } from "@/components/layout/panel-frame"
import { DeclineRequestDialog } from "@/components/requests/decline-request-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import { CLINIC_TIMEZONE } from "@/features/physician/types"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { actionApproveConsultationRequest } from "@/lib/health/queue-server-actions"
import { formatClinicTime, zonedDayKey } from "@/lib/physician/timezone"

export function RoleDashboardSummaries({
  access,
  summary,
}: {
  access: StaffAccess
  summary: RoleDashboardSummary
}) {
  const router = useRouter()
  const d = access.designation
  const base = `/${d}`
  const isAdmin = d === "admin"
  const isNurse = d === "nurse"
  const isPhysician = d === "physician"
  const isDentist = d === "dentist"
  const isSpecialty = isPhysician || isDentist

  const nurseQueueHref = "/nurse/queue-management"
  const nurseRequestsHref = "/nurse/consultation-requests"

  const canTriage = can(d, "requests.approve")
  const canDecline = can(d, "requests.decline")
  const canGenerateCert = can(d, "certificates.generate")
  const canGenerateFromConsult = can(d, "consultations.generate_certificate")
  const [pendingApprove, startApprove] = useTransition()
  const [declineTarget, setDeclineTarget] = useState<{
    id: string
    patientName: string
  } | null>(null)

  const todayKey = zonedDayKey(new Date().toISOString(), CLINIC_TIMEZONE)
  const todaysAppointments =
    summary.physicianWorkspace?.appointments
      .filter(
        (a) =>
          zonedDayKey(a.startsAt, a.timezone) === todayKey &&
          a.status !== "cancelled"
      )
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
      .slice(0, 6) ?? []

  return (
    <>
      {isAdmin ? (
        <>
          <PanelCell className="lg:col-span-2">
            <ModuleSnapshot
              title="Operations"
              description="Queue load across the clinic (view only)."
              href={`${base}/queue`}
              linkLabel="Queue management"
              badge={
                (summary.nurseLanes?.needIntake ?? 0) +
                (summary.nurseLanes?.atPhysician ?? 0) +
                (summary.nurseLanes?.atDentist ?? 0)
              }
            >
              <SnapshotStatRow
                items={[
                  {
                    label: "Need intake",
                    value: summary.nurseLanes?.needIntake ?? 0,
                  },
                  {
                    label: "Physician",
                    value: summary.nurseLanes?.atPhysician ?? 0,
                  },
                  {
                    label: "Dentist",
                    value: summary.nurseLanes?.atDentist ?? 0,
                  },
                  {
                    label: "Exceptions",
                    value: summary.nurseLanes?.exceptions ?? 0,
                  },
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href="/display" />}
                  nativeButton={false}
                >
                  Public display
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`${base}/reports`} />}
                  nativeButton={false}
                >
                  Open reports
                </Button>
              </div>
            </ModuleSnapshot>
          </PanelCell>

          <PanelCell>
            <ModuleSnapshot
              title="Administration"
              description="Staff directory health."
              href={`${base}/user-management/staff`}
              linkLabel="Manage users"
            >
              {summary.staffSummary ? (
                <SnapshotStatRow
                  items={[
                    { label: "Active", value: summary.staffSummary.active },
                    { label: "Invited", value: summary.staffSummary.invited },
                    {
                      label: "Inactive",
                      value: summary.staffSummary.inactive,
                    },
                    { label: "Total", value: summary.staffSummary.total },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Staff directory is unavailable right now.
                </p>
              )}
            </ModuleSnapshot>
          </PanelCell>
        </>
      ) : null}

      {isNurse ? (
        <>
          <PanelCell className="lg:col-span-2">
            <ModuleSnapshot
              title="Consultation requests"
              description="Pending requests waiting for triage."
              href={nurseRequestsHref}
              linkLabel="View all"
              badge={summary.requests.pendingCount}
            >
              {summary.requests.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending requests.
                </p>
              ) : (
                <ul className="space-y-2">
                  {summary.requests.recent.map((req) => (
                    <li
                      key={req.id}
                      className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{req.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.service} · {req.preferredDate}{" "}
                          {req.preferredTime}
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
                              href={`${nurseRequestsHref}?id=${encodeURIComponent(req.id)}`}
                            />
                          }
                          nativeButton={false}
                        >
                          View
                        </Button>
                        {canTriage ? (
                          <Button
                            size="sm"
                            disabled={pendingApprove || Boolean(declineTarget)}
                            onClick={() =>
                              startApprove(async () => {
                                const result =
                                  await actionApproveConsultationRequest({
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
                            disabled={pendingApprove || Boolean(declineTarget)}
                            onClick={() =>
                              setDeclineTarget({
                                id: req.id,
                                patientName: req.patientName,
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
          </PanelCell>

          <PanelCell>
            <ModuleSnapshot
              title="Stations handoff"
              description="Patients after nurse intake."
              href={nurseQueueHref}
            >
              <SnapshotStatRow
                items={[
                  {
                    label: "At physician",
                    value: summary.nurseLanes?.atPhysician ?? 0,
                  },
                  {
                    label: "At dentist",
                    value: summary.nurseLanes?.atDentist ?? 0,
                  },
                  {
                    label: "Checked in",
                    value: summary.nurseLanes?.checkedIn ?? 0,
                  },
                  {
                    label: "Intakes done",
                    value: summary.nurseLanes?.completedIntakes ?? 0,
                  },
                ]}
              />
            </ModuleSnapshot>
          </PanelCell>
        </>
      ) : null}

      {isAdmin ? (
        <PanelCell className="lg:col-span-2">
          <ModuleSnapshot
            title="Consultation requests"
            description="Incoming requests across the clinic (view only)."
            href={`${base}/requests`}
            badge={summary.requests.pendingCount}
          >
            {summary.requests.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.requests.recent.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {req.patientName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {req.service} · {req.preferredDate}
                      </p>
                    </div>
                    <Badge variant="secondary">{req.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </ModuleSnapshot>
        </PanelCell>
      ) : null}

      {isPhysician ? (
        <PanelCell className="lg:col-span-3">
          <ModuleSnapshot
            title="Today's appointments"
            description="Your clinic board for today."
            href={`${base}/appointments`}
            badge={summary.physicianWorkspace?.stats.todayCount ?? 0}
          >
            {todaysAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No appointments today. Check upcoming days or update
                availability.
              </p>
            ) : (
              <ul className="space-y-2">
                {todaysAppointments.map((apt) => (
                  <li
                    key={apt.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{apt.patientName}</p>
                        <AppointmentStatusBadge status={apt.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatClinicTime(apt.startsAt, apt.timezone)} ·{" "}
                        {apt.reason ?? "No reason listed"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        apt.status === "in_progress" ? "default" : "outline"
                      }
                      render={
                        <Link href={`/physician/consultation/${apt.id}`} />
                      }
                      nativeButton={false}
                    >
                      {apt.status === "in_progress" ? "Continue" : "Open"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`${base}/appointments`} />}
                nativeButton={false}
              >
                Open appointments
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`${base}/settings`} />}
                nativeButton={false}
              >
                Manage schedule
              </Button>
            </div>
          </ModuleSnapshot>
        </PanelCell>
      ) : null}

      {isDentist ? (
        <PanelCell className="lg:col-span-2">
          <ModuleSnapshot
            title="Recent dental consultations"
            description="Latest completed dental charts."
            href={`${base}/consultations`}
            linkLabel="Open consultations"
            badge={summary.recentConsultations.length}
          >
            {summary.recentConsultations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No completed dental consultations yet today.
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.recentConsultations.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.patientName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.diagnosis || "No diagnosis"}
                        {row.treatment ? ` · ${row.treatment}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {row.consultationDate.slice(0, 10)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </ModuleSnapshot>
        </PanelCell>
      ) : null}

      <PanelCell className={isSpecialty ? undefined : "lg:col-span-2"}>
        <ModuleSnapshot
          title={isDentist ? "Dental consultations" : "Consultations"}
          description="Clinical visit status today."
          href={`${base}/consultations`}
        >
          <SnapshotStatRow
            items={[
              {
                label: "Open",
                value: summary.consultationStats.openToday,
              },
              {
                label: "Awaiting",
                value: summary.consultationStats.awaitingAssessment,
              },
              {
                label: "In progress",
                value: summary.consultationStats.inProgress,
              },
              {
                label: "Completed",
                value: summary.consultationStats.completedToday,
              },
            ]}
          />
        </ModuleSnapshot>
      </PanelCell>

      <PanelCell>
        <ModuleSnapshot
          title={isDentist ? "Dental certificates" : "Medical certificates"}
          description={
            isNurse
              ? "View-only certificate overview."
              : canGenerateFromConsult
                ? "Issue certificates from completed consults."
                : "Certificate drafts and issued counts."
          }
          href={`${base}/certificates`}
        >
          <SnapshotStatRow
            items={[
              {
                label: "Issued today",
                value: summary.certificateStats.issuedToday,
              },
              {
                label: "This month",
                value: summary.certificateStats.issuedThisMonth,
              },
              { label: "Drafts", value: summary.certificateStats.drafts },
              { label: "Pending", value: summary.certificateStats.pending },
            ]}
          />
          {canGenerateCert && !isNurse ? (
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`${base}/certificates`} />}
              nativeButton={false}
            >
              {canGenerateFromCertLabel(canGenerateFromConsult)}
            </Button>
          ) : null}
        </ModuleSnapshot>
      </PanelCell>

      {summary.patientStats ? (
        <PanelCell>
          <ModuleSnapshot
            title="Patient records"
            description="Enrolled student directory."
            href={isNurse ? "/nurse/patient-records" : `${base}/patients`}
            linkLabel="Open records"
          >
            <SnapshotStatRow
              items={[
                {
                  label: "On file",
                  value: summary.patientStats.patientsOnFile,
                },
                {
                  label: "Visited mo.",
                  value: summary.patientStats.visitedThisMonth,
                },
              ]}
            />
            <Button
              size="sm"
              variant="outline"
              render={
                <Link
                  href={
                    isNurse ? "/nurse/patient-records" : `${base}/patients`
                  }
                />
              }
              nativeButton={false}
            >
              Search patients
            </Button>
          </ModuleSnapshot>
        </PanelCell>
      ) : null}

      {isSpecialty && summary.schedule ? (
        <PanelCell>
          <ModuleSnapshot
            title="Schedule"
            description={`${summary.schedule.todayLabel} availability`}
            href={`${base}/settings`}
            linkLabel="Edit schedule"
          >
            {summary.schedule.onBreak || summary.schedule.clinicOnBreak ? (
              <Badge variant="secondary">
                {summary.schedule.onBreak
                  ? "You are on break"
                  : "Clinic is on break"}
                {summary.schedule.resumesAt
                  ? ` · resumes ${new Date(
                      summary.schedule.resumesAt
                    ).toLocaleTimeString("en-PH", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : ""}
              </Badge>
            ) : (
              <Badge variant="outline">Available</Badge>
            )}
            {summary.schedule.todaySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active slots set for today.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {summary.schedule.todaySlots.map((slot) => (
                  <li key={`${slot.startTime}-${slot.endTime}`}>
                    {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                  </li>
                ))}
              </ul>
            )}
          </ModuleSnapshot>
        </PanelCell>
      ) : null}

      <PanelCell className={isAdmin || isNurse ? "lg:col-span-2" : undefined}>
        <ModuleSnapshot
          title="Announcements"
          description={
            isAdmin || isNurse
              ? "Published clinic notices."
              : "Latest clinic notices."
          }
          href={`${base}/announcements`}
          badge={summary.announcements.publishedCount}
          linkLabel={isAdmin || isNurse ? "Manage" : "View all"}
        >
          {summary.announcements.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published announcements.
            </p>
          ) : (
            <ul className="space-y-3">
              {summary.announcements.recent.map((ann) => (
                <li key={ann.id}>
                  <Link
                    href={`${base}/announcements`}
                    className="group flex gap-3 rounded-lg border border-border/60 p-2 transition-colors hover:border-border hover:bg-muted/40"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {ann.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ann.coverUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/15 to-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium group-hover:text-primary">
                        {ann.title}
                      </p>
                      {ann.excerpt ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {ann.excerpt}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {ann.audience}
                        {ann.publishedAt ? ` · ${ann.publishedAt}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ModuleSnapshot>
      </PanelCell>

      <DeclineRequestDialog
        open={Boolean(declineTarget)}
        onOpenChange={(open) => {
          if (!open) setDeclineTarget(null)
        }}
        requestId={declineTarget?.id ?? null}
        patientName={declineTarget?.patientName}
        onDeclined={() => {
          setDeclineTarget(null)
          router.refresh()
        }}
      />
    </>
  )
}

function canGenerateFromCertLabel(fromConsult: boolean) {
  return fromConsult ? "Generate from consult" : "Open certificates"
}
