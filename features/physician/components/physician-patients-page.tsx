"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { IconSearch, IconUserHeart } from "@tabler/icons-react"

import { Badge } from "@/components/reui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/features/common/components/page-header"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import { formatClinicDateTime } from "@/lib/physician/timezone"

type PatientsPageProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianPatientsPage({ workspace }: PatientsPageProps) {
  const searchParams = useSearchParams()
  const initialId = searchParams.get("patient")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialId ?? workspace.patients[0]?.id ?? null
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workspace.patients
    return workspace.patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.studentId ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
    )
  }, [query, workspace.patients])

  const selected = workspace.patients.find((p) => p.id === selectedId) ?? null
  const history = workspace.appointments
    .filter((a) => a.patientId === selected?.id)
    .sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
    )
  const records = workspace.consultations.filter(
    (c) => c.patientId === selected?.id
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Patients"
        subtitle="Search and clinical profile"
        description="Find students and faculty, review history, and open prior consultation notes."
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Patient search</CardTitle>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email, or student ID"
                className="pl-9"
                aria-label="Search patients"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No patients match “{query}”.
              </p>
            ) : (
              filtered.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedId(patient.id)}
                  className={`flex w-full min-w-0 flex-col rounded-xl border px-3 py-2 text-left transition-colors ${
                    selectedId === patient.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <span className="truncate font-medium">{patient.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {patient.studentId ?? "No ID"} · {patient.email ?? "No email"}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          {!selected ? (
            <CardContent className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <IconUserHeart className="size-8 text-muted-foreground" />
              <p className="font-medium">Select a patient</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Search the roster to open a detailed profile and visit history.
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{selected.fullName}</CardTitle>
                  <Badge variant="info-light" size="sm">
                    {selected.timezone}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selected.studentId ?? "No student/faculty ID"} ·{" "}
                  {selected.email ?? "No email"} · {selected.phone ?? "No phone"}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Clinical notes on file</h3>
                  <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                    {selected.medicalNotes ??
                      "No previous medical notes recorded for this patient."}
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium">Visit history</h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No appointments on record yet.
                    </p>
                  ) : (
                    history.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {visit.reason ?? "Clinic visit"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatClinicDateTime(visit.startsAt, visit.timezone)}
                          </p>
                        </div>
                        <AppointmentStatusBadge status={visit.status} />
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium">Consultation records</h3>
                  {records.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No previous consultation records for this patient.
                    </p>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.id}
                        className="space-y-1 rounded-xl border border-border/60 px-3 py-3"
                      >
                        <p className="text-sm font-medium">
                          {record.diagnosis || "Diagnosis pending"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Symptoms: {record.symptoms || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rx: {record.prescription || "None recorded"}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
