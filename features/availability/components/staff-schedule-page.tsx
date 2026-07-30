"use client"

import { useState, useTransition } from "react"
import { IconClockPlus, IconTrash } from "@tabler/icons-react"

import { OnBreakControl } from "@/components/availability/on-break-control"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  deleteStaffWeeklySlot,
  upsertStaffWeeklySlot,
} from "@/features/availability/actions/availability"
import { PageHeader } from "@/features/common/components/page-header"
import type { ClinicOfficeHour, StaffWeeklyHour } from "@/lib/availability/types"
import { CLINIC_TIMEZONE, DAY_LABELS } from "@/lib/availability/types"
import type { WebRole } from "@/lib/auth/types"

type StaffSchedulePageProps = {
  role: Extract<WebRole, "physician" | "dentist">
  doctorName: string
  availability: StaffWeeklyHour[]
  clinicHours: ClinicOfficeHour[]
  /** When true, copy reflects Account settings placement (not Clinical nav). */
  embeddedInSettings?: boolean
}

export function StaffSchedulePage({
  role,
  doctorName,
  availability,
  clinicHours,
  embeddedInSettings = false,
}: StaffSchedulePageProps) {
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("12:00")
  const [timezone, setTimezone] = useState(
    availability[0]?.timezone ?? CLINIC_TIMEZONE
  )
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const slots = [...availability].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
  )

  function addSlot() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await upsertStaffWeeklySlot({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        timezone,
        isActive: true,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage("Availability slot saved.")
    })
  }

  function removeSlot(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteStaffWeeklySlot(id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage("Slot removed.")
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={embeddedInSettings ? "My schedule" : "Schedule"}
          subtitle={doctorName}
          description={
            embeddedInSettings
              ? "Manage your weekly availability from account settings. Appointment times must fall inside clinic hours and your schedule, and are blocked while you or the clinic are on break."
              : "Set your weekly office hours. Appointment times must fall inside both clinic hours and your schedule, and are blocked while you or the clinic are on break."
          }
        />
        <OnBreakControl mode="staff" role={role} />
      </div>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Clinic hours (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {clinicHours.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Clinic hours not configured yet.
            </p>
          ) : (
            clinicHours.map((day) => (
              <Badge key={day.id} variant="invert-light" size="sm">
                {DAY_LABELS[day.dayOfWeek]}:{" "}
                {day.isClosed
                  ? "Closed"
                  : `${day.startTime}–${day.endTime}`}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      {slots.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>No schedule set yet</AlertTitle>
          <AlertDescription>
            Patients and staff cannot book you until you define recurring
            availability. Add at least one weekly slot below.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not update schedule</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert variant="success" role="status">
          <AlertTitle>Schedule updated</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Add recurring slot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dow">Day of week</Label>
              <Select value={dayOfWeek} onValueChange={(v) => setDayOfWeek(v ?? "1")}>
                <SelectTrigger id="dow" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tz">Timezone</Label>
              <Input
                id="tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Manila"
              />
            </div>
            <Button disabled={isPending} onClick={addSlot}>
              <IconClockPlus data-icon="inline-start" />
              Save slot
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Current weekly hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {slots.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No recurring slots yet.
              </p>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {DAY_LABELS[slot.dayOfWeek]} · {slot.startTime}–
                      {slot.endTime}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="invert-light" size="sm">
                        {slot.timezone}
                      </Badge>
                      <Badge
                        variant={slot.isActive ? "success-light" : "warning-light"}
                        size="sm"
                      >
                        {slot.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Remove ${DAY_LABELS[slot.dayOfWeek]} slot`}
                    disabled={isPending || slot.id.startsWith("av-")}
                    onClick={() => removeSlot(slot.id)}
                  >
                    <IconTrash />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
