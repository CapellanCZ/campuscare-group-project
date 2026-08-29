"use client"

import Link from "next/link"

import {
  ModuleSnapshot,
  SnapshotStatRow,
} from "@/components/dashboard/module-snapshot"
import { NurseRequestsPanel } from "@/components/dashboard/nurse-requests-panel"
import { PanelCell } from "@/components/layout/panel-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { useOptionalDutyStatus } from "@/components/availability/duty-status-control"
import { dutyStatusLabel } from "@/lib/availability/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"

function ScheduleAvailabilityBadge({
  onBreak,
  clinicOnBreak,
  resumesAt,
}: {
  onBreak: boolean
  clinicOnBreak: boolean
  resumesAt: string | null
}) {
  const duty = useOptionalDutyStatus()

  if (onBreak || clinicOnBreak) {
    return (
      <Badge variant="secondary">
        {onBreak ? "You are on break" : "Clinic is on break"}
        {resumesAt
          ? ` · resumes ${new Date(resumesAt).toLocaleTimeString("en-PH", {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : ""}
      </Badge>
    )
  }

  const label = duty ? dutyStatusLabel(duty.dutyStatus.status) : "Not Available"
  const variant =
    duty?.dutyStatus.status === "available"
      ? "default"
      : duty?.dutyStatus.status === "on_break"
        ? "secondary"
        : "outline"

  return <Badge variant={variant}>{label}</Badge>
}

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

  const nurseQueueHref = "/nurse/queue-management"

  const canGenerateCert = can(d, "certificates.generate")
  const canGenerateFromConsult = can(d, "consultations.generate_certificate")

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
            <NurseRequestsPanel access={access} summary={summary} />
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

      <PanelCell
        className={
          isPhysician ? "lg:col-span-2" : isSpecialty ? undefined : "lg:col-span-2"
        }
      >
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
              ...(isPhysician
                ? []
                : [
                    {
                      label: "Awaiting",
                      value: summary.consultationStats.awaitingAssessment,
                    },
                  ]),
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

      {!isPhysician ? (
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
      ) : null}

      {!isPhysician && summary.patientStats ? (
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
            <ScheduleAvailabilityBadge
              onBreak={Boolean(summary.schedule.onBreak)}
              clinicOnBreak={Boolean(summary.schedule.clinicOnBreak)}
              resumesAt={summary.schedule.resumesAt}
            />
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

      {!isPhysician ? (
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
      ) : null}
    </>
  )
}

function canGenerateFromCertLabel(fromConsult: boolean) {
  return fromConsult ? "Generate from consult" : "Open certificates"
}
