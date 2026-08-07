"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import { adminElevatedCardClassName } from "@/features/admin/lib/admin-surface"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  loadStaffHoursBundle,
  upsertClinicHoursDay,
  upsertStaffWeeklySlot,
} from "@/features/availability/actions/availability"
import { PageHeader } from "@/features/common/components/page-header"
import type {
  ClinicOfficeHour,
  StaffHoursPerson,
  StaffWeeklyHour,
} from "@/lib/availability/types"
import { DAY_LABELS } from "@/lib/availability/types"
import type { StaffAccess } from "@/lib/auth/types"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

type OfficeHoursSettingsProps = {
  access: StaffAccess
  clinicHours: ClinicOfficeHour[]
  staff: StaffHoursPerson[]
}

type DayDraft = {
  dayOfWeek: number
  isClosed: boolean
  startTime: string
  endTime: string
}

export function OfficeHoursSettings({
  access,
  clinicHours,
  staff,
}: OfficeHoursSettingsProps) {
  useStaffRealtimeRouterRefresh(
    `staff-office-hours-${access.userId}`,
    STAFF_REALTIME_TABLES.officeHours
  )

  const [days, setDays] = useState<DayDraft[]>(() =>
    DAY_LABELS.map((_, index) => {
      const row = clinicHours.find((h) => h.dayOfWeek === index)
      return {
        dayOfWeek: index,
        isClosed: row?.isClosed ?? index === 0,
        startTime: row?.startTime ?? "07:00",
        endTime: row?.endTime ?? (index === 6 ? "19:00" : "21:00"),
      }
    })
  )

  useEffect(() => {
    setDays(
      DAY_LABELS.map((_, index) => {
        const row = clinicHours.find((h) => h.dayOfWeek === index)
        return {
          dayOfWeek: index,
          isClosed: row?.isClosed ?? index === 0,
          startTime: row?.startTime ?? "07:00",
          endTime: row?.endTime ?? (index === 6 ? "19:00" : "21:00"),
        }
      })
    )
  }, [clinicHours])
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.userId ?? "")
  const [staffSlots, setStaffSlots] = useState<StaffWeeklyHour[]>([])
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("18:00")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedStaff = useMemo(
    () => staff.find((s) => s.userId === selectedStaffId) ?? null,
    [staff, selectedStaffId]
  )

  useEffect(() => {
    if (!selectedStaffId) return
    let cancelled = false
    startTransition(async () => {
      const bundle = await loadStaffHoursBundle(selectedStaffId)
      if (cancelled) return
      setStaffSlots(bundle.slots)
    })
    return () => {
      cancelled = true
    }
  }, [selectedStaffId])

  function saveClinicDay(day: DayDraft) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await upsertClinicHoursDay({
        dayOfWeek: day.dayOfWeek,
        isClosed: day.isClosed,
        startTime: day.isClosed ? null : day.startTime,
        endTime: day.isClosed ? null : day.endTime,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(result.message ?? "Saved.")
    })
  }

  function addStaffSlot() {
    if (!selectedStaffId) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await upsertStaffWeeklySlot({
        userId: selectedStaffId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        timezone: "Asia/Manila",
        isActive: true,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const bundle = await loadStaffHoursBundle(selectedStaffId)
      setStaffSlots(bundle.slots)
      setMessage(result.message ?? "Slot saved.")
    })
  }

  function removeStaffSlot(id: string) {
    if (!selectedStaffId) return
    startTransition(async () => {
      const result = await deleteStaffWeeklySlot(id, selectedStaffId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const bundle = await loadStaffHoursBundle(selectedStaffId)
      setStaffSlots(bundle.slots)
      setMessage("Slot removed.")
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Office hours" />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" role="status">
          <AlertTitle>Updated</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className={adminElevatedCardClassName}>
        <CardHeader>
          <CardTitle className="text-base">Clinic hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {days.map((day) => (
            <div
              key={day.dayOfWeek}
              className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-[7rem] font-medium">
                {DAY_LABELS[day.dayOfWeek]}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={day.isClosed}
                  onCheckedChange={(checked) => {
                    setDays((prev) =>
                      prev.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, isClosed: Boolean(checked) }
                          : d
                      )
                    )
                  }}
                />
                Closed
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="time"
                  className="w-[8.5rem]"
                  disabled={day.isClosed}
                  value={day.startTime}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, startTime: e.target.value }
                          : d
                      )
                    )
                  }
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  className="w-[8.5rem]"
                  disabled={day.isClosed}
                  value={day.endTime}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, endTime: e.target.value }
                          : d
                      )
                    )
                  }
                />
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    saveClinicDay(days.find((d) => d.dayOfWeek === day.dayOfWeek)!)
                  }
                >
                  <IconDeviceFloppy data-icon="inline-start" />
                  Save
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={adminElevatedCardClassName}>
        <CardHeader>
          <CardTitle className="text-base">Staff weekly hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active nurses, physicians, or dentists to edit.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Staff member</Label>
                <Select
                  value={selectedStaffId}
                  onValueChange={(value) => {
                    if (value) setSelectedStaffId(value)
                  }}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((person) => (
                      <SelectItem key={person.userId} value={person.userId}>
                        {person.fullName} · {person.primaryRole}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStaff ? (
                  <p className="text-xs text-muted-foreground">
                    Editing {selectedStaff.email}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-2 sm:col-span-1">
                  <Label>Day</Label>
                  <Select
                    value={dayOfWeek}
                    onValueChange={(v) => setDayOfWeek(v ?? "1")}
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button disabled={isPending || !selectedStaffId} onClick={addStaffSlot}>
                    <IconPlus data-icon="inline-start" />
                    Add slot
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {staffSlots.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No weekly slots for this staff member yet.
                  </p>
                ) : (
                  staffSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {DAY_LABELS[slot.dayOfWeek]} · {slot.startTime}–
                          {slot.endTime}
                        </p>
                        <Badge
                          variant={slot.isActive ? "success-light" : "warning-light"}
                          size="sm"
                          className="mt-1"
                        >
                          {slot.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={isPending}
                        aria-label="Remove slot"
                        onClick={() => removeStaffSlot(slot.id)}
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
