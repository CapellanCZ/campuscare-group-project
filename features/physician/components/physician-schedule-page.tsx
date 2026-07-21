"use client"

import { useState, useTransition } from "react"
import { IconClockPlus, IconTrash } from "@tabler/icons-react"

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
import { PageHeader } from "@/features/common/components/page-header"
import {
  deleteAvailabilitySlot,
  upsertAvailabilitySlot,
} from "@/features/physician/actions/appointments"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import { CLINIC_TIMEZONE, DAY_LABELS } from "@/features/physician/types"

type SchedulePageProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianSchedulePage({ workspace }: SchedulePageProps) {
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("12:00")
  const [timezone, setTimezone] = useState(
    workspace.availability[0]?.timezone ?? CLINIC_TIMEZONE
  )
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const slots = [...workspace.availability].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
  )

  function addSlot() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await upsertAvailabilitySlot({
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
      const result = await deleteAvailabilitySlot(id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage("Slot removed.")
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        subtitle="Recurring availability"
        description="Set weekly clinic hours. Double-booking is blocked when appointments overlap these protected times."
      />

      {slots.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>No schedule set yet</AlertTitle>
          <AlertDescription>
            Patients and staff cannot reliably book you until you define recurring
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
              <p className="text-xs text-muted-foreground">
                University campuses may differ — store availability in IANA zones.
              </p>
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
                      {DAY_LABELS[slot.dayOfWeek]} · {slot.startTime}–{slot.endTime}
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
