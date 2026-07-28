"use client"

import Link from "next/link"
import { toast } from "sonner"

import {
  ModuleSnapshot,
  SnapshotStatRow,
} from "@/components/dashboard/module-snapshot"
import { demoToast } from "@/components/demo/demo-page"
import { PanelCell } from "@/components/layout/panel-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import { CLINIC_TIMEZONE } from "@/features/physician/types"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { formatClinicTime, zonedDayKey } from "@/lib/physician/timezone"

export function RoleDashboardSummaries({
  access,
  summary,
}: {
  access: StaffAccess
  summary: RoleDashboardSummary
}) {
  const d = access.designation
  const base = `/${d}`
  const isAdmin = d === "admin"
  const isNurse = d === "nurse"
  const isPhysician = d === "physician"
  const isDentist = d === "dentist"
  const isSpecialty = isPhysician || isDentist

  const canTriage = can(d, "requests.approve")
  const canGenerateCert = can(d, "certificates.generate")
  const canGenerateFromConsult = can(d, "consultations.generate_certificate")

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
                      className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{req.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.studentId} · {req.service} · {req.preferredDate}{" "}
                          {req.preferredTime}
                        </p>
                      </div>
                      {canTriage ? (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            onClick={() =>
                              toast.success(demoToast("Approve request"))
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toast.message(demoToast("Decline request"))
                            }
                          >
                            Decline
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </ModuleSnapshot>
          </PanelCell>

          <PanelCell>
            <ModuleSnapshot
              title="Queue shortcuts"
              description="Front-desk intake actions."
              href={`${base}/queue`}
            >
              <SnapshotStatRow
                items={[
                  {
                    label: "Checked in",
                    value: summary.nurseLanes?.checkedIn ?? 0,
                  },
                  {
                    label: "Exceptions",
                    value: summary.nurseLanes?.exceptions ?? 0,
                  },
                ]}
              />
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  render={<Link href={`${base}/queue`} />}
                  nativeButton={false}
                >
                  Register walk-in
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`${base}/queue`} />}
                  nativeButton={false}
                >
                  Verify check-in
                </Button>
              </div>
            </ModuleSnapshot>
          </PanelCell>

          <PanelCell className="lg:col-span-3">
            <ModuleSnapshot
              title="Stations handoff"
              description="Patients after nurse intake."
              href={`${base}/queue`}
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
                    label: "Intakes done",
                    value: summary.nurseLanes?.completedIntakes ?? 0,
                  },
                ]}
              />
            </ModuleSnapshot>
          </PanelCell>
        </>
      ) : null}

      {(isAdmin || isNurse || isSpecialty) && !isNurse ? (
        <PanelCell className={isAdmin ? "lg:col-span-2" : undefined}>
          <ModuleSnapshot
            title="Consultation requests"
            description={
              isAdmin
                ? "Incoming requests across the clinic (view only)."
                : "Recent pending requests."
            }
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
            {summary.physicianWorkspace?.source === "demo" ? (
              <Badge variant="outline">Demo appointments until live rows exist</Badge>
            ) : null}
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
                render={<Link href={`${base}/schedule`} />}
                nativeButton={false}
              >
                Manage schedule
              </Button>
            </div>
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
            href={`${base}/patients`}
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
              render={<Link href={`${base}/patients`} />}
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
            href={`${base}/schedule`}
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

      <PanelCell className={isAdmin ? "lg:col-span-2" : undefined}>
        <ModuleSnapshot
          title="Announcements"
          description={
            isAdmin
              ? "Published clinic notices."
              : "Latest clinic notices."
          }
          href={`${base}/announcements`}
          badge={summary.announcements.publishedCount}
          linkLabel={isAdmin ? "Manage" : "View all"}
        >
          {summary.announcements.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published announcements.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.announcements.recent.map((ann) => (
                <li
                  key={ann.id}
                  className="border-b border-border/60 py-2 last:border-0 last:pb-0"
                >
                  <p className="text-sm font-medium">{ann.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ann.audience}
                    {ann.publishedAt ? ` · ${ann.publishedAt}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ModuleSnapshot>
      </PanelCell>
    </>
  )
}

function canGenerateFromCertLabel(fromConsult: boolean) {
  return fromConsult ? "Generate from consult" : "Open certificates"
}
