"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconTrash } from "@tabler/icons-react"

import {
  getStaffUserForEdit,
  updateStaffUser,
} from "@/features/admin/actions/user-management"
import {
  roleLabel,
  type DirectoryConfig,
} from "@/features/admin/lib/user-directory-config"
import type {
  ManagedRole,
  ManagedStaffUser,
  StaffScheduleSlotInput,
} from "@/features/admin/types/user-management"
import { isLicensedProfessionalRole } from "@/features/admin/types/user-management"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { DAY_LABELS } from "@/lib/availability/types"

type DraftSlot = StaffScheduleSlotInput & { key: string }

type UserEditSheetProps = {
  config: DirectoryConfig
  user: ManagedStaffUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (user: ManagedStaffUser) => void
}

function newSlotKey() {
  return `slot-${Math.random().toString(36).slice(2, 9)}`
}

export function UserEditSheet({
  config,
  user,
  open,
  onOpenChange,
  onSaved,
}: UserEditSheetProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ManagedRole>(config.defaultCreateRole)
  const [licenseNumber, setLicenseNumber] = useState("")
  const [slots, setSlots] = useState<DraftSlot[]>([])
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("18:00")
  const [error, setError] = useState<string | null>(null)

  const showSchedule = role !== "admin"
  const showLicenseNumber = isLicensedProfessionalRole(role)

  useEffect(() => {
    if (!open || !user) return

    setFullName(user.fullName)
    setEmail(user.email)
    setRole(user.role)
    setLicenseNumber("")
    setError(null)
    setLoading(true)

    startTransition(async () => {
      const result = await getStaffUserForEdit(user.id)
      setLoading(false)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setFullName(result.data.fullName)
      setEmail(result.data.email)
      setRole(result.data.role)
      setLicenseNumber(result.data.licenseNumber ?? "")
      setSlots(
        result.data.scheduleSlots.map((slot) => ({
          key: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
        }))
      )
    })
  }, [open, user])

  function addSlot() {
    if (endTime <= startTime) {
      setError("End time must be after start time.")
      return
    }
    setError(null)
    setSlots((current) => [
      ...current,
      {
        key: newSlotKey(),
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        isActive: true,
      },
    ])
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    setError(null)

    startTransition(async () => {
      const result = await updateStaffUser({
        userId: user.id,
        fullName,
        email,
        role,
        licenseNumber: showLicenseNumber ? licenseNumber : null,
        allowedRoles: [...config.roles],
        scheduleSlots: showSchedule
          ? slots.map(({ dayOfWeek: dow, startTime: start, endTime: end, isActive }) => ({
              dayOfWeek: dow,
              startTime: start,
              endTime: end,
              isActive,
            }))
          : undefined,
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      onSaved({
        ...user,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
      })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit {user?.fullName ?? "staff"}</SheetTitle>
          <SheetDescription>
            Update name, email
            {config.allowRoleChange ? ", role" : ""}
            {showLicenseNumber ? ", licensed number" : ""}
            {showSchedule ? ", and weekly schedule" : ""}.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
          onSubmit={onSubmit}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-name">Full name</FieldLabel>
              <Input
                id="edit-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                disabled={pending || loading}
                autoComplete="name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-email">Email</FieldLabel>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={pending || loading}
                autoComplete="email"
              />
            </Field>
            {config.allowRoleChange ? (
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole((value as ManagedRole) ?? config.defaultCreateRole)
                  }
                  disabled={pending || loading}
                >
                  <SelectTrigger className="w-full" aria-label="Staff role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.roles.map((option) => (
                      <SelectItem key={option} value={option}>
                        {roleLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Input value={roleLabel(role)} disabled readOnly />
              </Field>
            )}
            {showLicenseNumber ? (
              <Field>
                <FieldLabel htmlFor="edit-license">Licensed number</FieldLabel>
                <Input
                  id="edit-license"
                  value={licenseNumber}
                  onChange={(event) => setLicenseNumber(event.target.value)}
                  placeholder="PRC license no."
                  disabled={pending || loading}
                  autoComplete="off"
                />
              </Field>
            ) : null}
          </FieldGroup>

          {showSchedule ? (
            <div className="space-y-3 rounded-xl border border-border/70 p-3">
              <div>
                <p className="text-sm font-medium">Weekly schedule</p>
                <p className="text-xs text-muted-foreground">
                  Office hours used for appointments and intake checks.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                <Select
                  value={dayOfWeek}
                  onValueChange={(value) => setDayOfWeek(value ?? "1")}
                  disabled={pending || loading}
                >
                  <SelectTrigger aria-label="Day of week">
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
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  disabled={pending || loading}
                  aria-label="Start time"
                />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  disabled={pending || loading}
                  aria-label="End time"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || loading}
                  onClick={addSlot}
                >
                  <IconPlus data-icon="inline-start" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading schedule…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No weekly slots yet. Add at least one day and time range.
                  </p>
                ) : (
                  slots.map((slot) => (
                    <div
                      key={slot.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span>
                        {DAY_LABELS[slot.dayOfWeek]} · {slot.startTime}–
                        {slot.endTime}
                      </span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label="Remove schedule slot"
                        disabled={pending}
                        onClick={() =>
                          setSlots((current) =>
                            current.filter((row) => row.key !== slot.key)
                          )
                        }
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={pending || loading} className="w-full">
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <SheetClose render={<Button type="button" variant="outline" />}>
              Cancel
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
