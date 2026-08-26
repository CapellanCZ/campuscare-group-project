"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconCalendarEvent,
  IconCheck,
  IconPlayerPlay,
  IconRefresh,
  IconX,
} from "@tabler/icons-react"
import { format, startOfDay } from "date-fns"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import {
  createFilter,
  Filters,
  type Filter,
  type FilterFieldConfig,
} from "@/components/reui/filters"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import {
  rescheduleAppointment,
  startConsultation,
  updateAppointmentStatus,
} from "@/features/physician/actions/appointments"
import type { PhysicianAppointment } from "@/features/physician/types"
import {
  canStartConsultation,
  isActionableStatus,
  isPastAppointment,
} from "@/features/physician/types"
import { formatClinicTime, zonedDayKey } from "@/lib/physician/timezone"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type AppointmentsBoardProps = {
  initialAppointments: PhysicianAppointment[]
  doctorId: string
}

function applyFilters(
  rows: PhysicianAppointment[],
  filters: Filter[],
  selectedDate: Date | undefined
): PhysicianAppointment[] {
  let next = [...rows]

  if (selectedDate) {
    const key = format(selectedDate, "yyyy-MM-dd")
    next = next.filter((row) => zonedDayKey(row.startsAt, row.timezone) === key)
  }

  for (const filter of filters) {
    if (!filter.values?.length) continue
    if (filter.field === "status") {
      const values = filter.values.map(String)
      next = next.filter((row) => values.includes(row.status))
    }
    if (filter.field === "patient") {
      const q = String(filter.values[0] ?? "")
        .trim()
        .toLowerCase()
      if (q) {
        next = next.filter(
          (row) =>
            row.patientName.toLowerCase().includes(q) ||
            (row.patientStudentId ?? "").toLowerCase().includes(q)
        )
      }
    }
  }

  return next.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )
}

export function AppointmentsBoard({
  initialAppointments,
  doctorId,
}: AppointmentsBoardProps) {
  const router = useRouter()
  const appointments = initialAppointments
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [filters, setFilters] = useState<Filter[]>([
    createFilter("status", "is_any_of", [
      "confirmed",
      "rescheduled",
      "in_progress",
    ]),
  ])
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  )
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`physician-appointments-${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [doctorId, router])

  const fields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: "patient",
        label: "Patient",
        type: "text",
        className: "w-44",
        placeholder: "Name or student ID...",
      },
      {
        key: "status",
        label: "Status",
        type: "multiselect",
        className: "w-52",
        options: [
          { value: "pending", label: "Pending" },
          { value: "confirmed", label: "Confirmed" },
          { value: "rescheduled", label: "Rescheduled" },
          { value: "in_progress", label: "In progress" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "no_show", label: "No-show" },
          { value: "waitlisted", label: "Waitlisted" },
        ],
      },
    ],
    []
  )

  const filtered = useMemo(
    () => applyFilters(appointments, filters, selectedDate),
    [appointments, filters, selectedDate]
  )

  const daysWithAppointments = useMemo(() => {
    const map = new Set(
      appointments
        .filter((a) => a.status !== "cancelled")
        .map((a) => zonedDayKey(a.startsAt, a.timezone))
    )
    return map
  }, [appointments])

  function runAction(
    appointmentId: string,
    action: () => Promise<{ ok: boolean; error?: string }>
  ) {
    setPendingId(appointmentId)
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? "Action failed." })
      } else {
        setMessage({ type: "success", text: "Appointment updated." })
        router.refresh()
      }
      setPendingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {message ? (
        <Alert variant={message.type === "error" ? "destructive" : "success"}>
          <AlertTitle>{message.type === "error" ? "Action failed" : "Updated"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Filters filters={filters} fields={fields} onChange={setFilters} size="sm" />
        <Badge variant="invert-light" size="sm">
          Times shown in each patient&apos;s timezone
        </Badge>
      </div>

      <Tabs defaultValue="split" className="min-w-0">
        <TabsList>
          <TabsTrigger value="split">Calendar + list</TabsTrigger>
          <TabsTrigger value="list">List only</TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="mt-4">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Schedule calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    booked: (date) =>
                      daysWithAppointments.has(format(startOfDay(date), "yyyy-MM-dd")),
                  }}
                  modifiersClassNames={{
                    booked: "bg-primary/15 font-semibold text-primary",
                  }}
                  className="w-full"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setSelectedDate(undefined)}
                >
                  Clear date filter
                </Button>
              </CardContent>
            </Card>

            <AppointmentList
              rows={filtered}
              selectedDate={selectedDate}
              pendingId={pendingId}
              isPending={isPending}
              onConfirm={(id) =>
                runAction(
                  id,
                  () => updateAppointmentStatus(id, "confirmed"))
              }
              onCancel={(id) =>
                runAction(
                  id,
                  () =>
                    updateAppointmentStatus(
                      id,
                      "cancelled",
                      "Cancelled by physician"
                    ))
              }
              onNoShow={(id) =>
                runAction(
                  id,
                  () => updateAppointmentStatus(id, "no_show"))
              }
              onReschedule={(id, row) => {
                const nextStart = new Date(row.startsAt)
                nextStart.setDate(nextStart.getDate() + 1)
                const nextEnd = new Date(row.endsAt)
                nextEnd.setDate(nextEnd.getDate() + 1)
                runAction(
                  id,
                  () =>
                    rescheduleAppointment(
                      id,
                      nextStart.toISOString(),
                      nextEnd.toISOString()
                    ))
              }}
              onStart={(id) => {
                runAction(
                  id,
                  async () => {
                    const result = await startConsultation(id)
                    if (result.ok) {
                      if (!result.consultationId) {
                        return {
                          ok: false,
                          error:
                            "No consultation record for this appointment. Nurse must approve first.",
                        }
                      }
                      router.push(
                        `/physician/consultation/${result.consultationId}`
                      )
                    }
                    return result
                  })
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <AppointmentList
            rows={filtered}
            selectedDate={selectedDate}
            pendingId={pendingId}
            isPending={isPending}
            onConfirm={(id) =>
              runAction(
                id,
                () => updateAppointmentStatus(id, "confirmed"))
            }
            onCancel={(id) =>
              runAction(
                id,
                () =>
                  updateAppointmentStatus(
                    id,
                    "cancelled",
                    "Cancelled by physician"
                  ))
            }
            onNoShow={(id) =>
              runAction(
                id,
                () => updateAppointmentStatus(id, "no_show"))
            }
            onReschedule={(id, row) => {
              const nextStart = new Date(row.startsAt)
              nextStart.setDate(nextStart.getDate() + 1)
              const nextEnd = new Date(row.endsAt)
              nextEnd.setDate(nextEnd.getDate() + 1)
              runAction(
                id,
                () =>
                  rescheduleAppointment(
                    id,
                    nextStart.toISOString(),
                    nextEnd.toISOString()
                  ))
            }}
            onStart={(id) => {
              runAction(
                id,
                async () => {
                  const result = await startConsultation(id)
                  if (result.ok) {
                    if (!result.consultationId) {
                      return {
                        ok: false,
                        error:
                          "No consultation record for this appointment. Nurse must approve first.",
                      }
                    }
                    router.push(
                      `/physician/consultation/${result.consultationId}`
                    )
                  }
                  return result
                })
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AppointmentList({
  rows,
  selectedDate,
  pendingId,
  isPending,
  onConfirm,
  onCancel,
  onNoShow,
  onReschedule,
  onStart,
}: {
  rows: PhysicianAppointment[]
  selectedDate?: Date
  pendingId: string | null
  isPending: boolean
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  onNoShow: (id: string) => void
  onReschedule: (id: string, row: PhysicianAppointment) => void
  onStart: (id: string) => void
}) {
  if (isPending && rows.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-border/80 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <IconCalendarEvent className="size-8 text-muted-foreground" />
          <p className="font-medium">No appointments for this view</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {selectedDate
              ? `Nothing scheduled on ${format(selectedDate, "MMMM d, yyyy")}. Try another day or clear filters.`
              : "No appointments match the current filters."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      {rows.map((row) => {
        const past = isPastAppointment(row.startsAt)
        const busy = pendingId === row.id

        return (
          <Card
            key={row.id}
            className={cn(
              "rounded-2xl border-border/70 shadow-sm",
              row.status === "in_progress" && "border-primary/40 bg-primary/5"
            )}
          >
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{row.patientName}</p>
                  <AppointmentStatusBadge status={row.status} />
                  {past && isActionableStatus(row.status) ? (
                    <Badge variant="warning-light" size="sm">
                      Past due
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatClinicTime(row.startsAt, row.timezone)} –{" "}
                  {formatClinicTime(row.endsAt, row.timezone)}
                  {row.location ? ` · ${row.location}` : null}
                  {row.timezone ? ` · ${row.timezone}` : null}
                </p>
                <p className="text-sm">{row.reason ?? "No chief complaint recorded"}</p>
                {row.patientStudentId ? (
                  <p className="text-xs text-muted-foreground">ID {row.patientStudentId}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {row.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onConfirm(row.id)}
                  >
                    <IconCheck data-icon="inline-start" />
                    Confirm
                  </Button>
                ) : null}

                {isActionableStatus(row.status) ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onReschedule(row.id, row)}
                    >
                      <IconRefresh data-icon="inline-start" />
                      Reschedule +1d
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onCancel(row.id)}
                    >
                      <IconX data-icon="inline-start" />
                      Cancel
                    </Button>
                    {past ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onNoShow(row.id)}
                      >
                        Mark no-show
                      </Button>
                    ) : null}
                  </>
                ) : null}

                {canStartConsultation(row.status) ? (
                  <Button size="sm" disabled={busy} onClick={() => onStart(row.id)}>
                    <IconPlayerPlay data-icon="inline-start" />
                    Start consultation
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant="ghost"
                  render={<Link href={`/physician/patients?patient=${row.patientId}`} />}
                  nativeButton={false}
                >
                  Patient
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
