"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { appToast } from "@/lib/feedback/app-toast"
import { staffToasts } from "@/lib/feedback/toast-messages"
import { IconUserPlus } from "@tabler/icons-react"

import { createStaffUser } from "@/features/admin/actions/user-management"
import type { DirectoryConfig } from "@/features/admin/lib/user-directory-config"
import type { ManagedRole } from "@/features/admin/types/user-management"
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
  SheetTrigger,
} from "@/components/ui/sheet"

type UserInviteSheetProps = {
  config: DirectoryConfig
  onCreated: () => void
  /** Compact outline trigger for card toolbars */
  toolbar?: boolean
}

export function UserInviteSheet({
  config,
  onCreated,
  toolbar = false,
}: UserInviteSheetProps) {
  const router = useRouter()
  const { confirmPreset } = useConfirm()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [role, setRole] = useState<ManagedRole>(config.defaultCreateRole)
  const [licenseNumber, setLicenseNumber] = useState("")
  const [error, setError] = useState<string | null>(null)

  const showLicenseNumber = isLicensedProfessionalRole(role)

  function resetForm() {
    setFullName("")
    setEmail("")
    setEmployeeId("")
    setRole(config.defaultCreateRole)
    setLicenseNumber("")
    setError(null)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    void confirmPreset("createStaff", {
      onConfirm: () => {
        startTransition(async () => {
          const result = await createStaffUser({
            fullName,
            email,
            role,
            employeeId: employeeId.trim() || null,
            licenseNumber: showLicenseNumber ? licenseNumber : null,
            allowedRoles: [...config.roles],
          })

          if (!result.ok) {
            setError(result.error)
            staffToasts.failed(result.error)
            return
          }

          appToast.success({ title: result.message })
          if (result.warning) appToast.warning({ title: result.warning })
          resetForm()
          setOpen(false)
          onCreated()
          router.refresh()
        })
      },
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="default"
            className={toolbar ? "shrink-0" : undefined}
          />
        }
      >
        <IconUserPlus data-icon="inline-start" aria-hidden="true" />
        {config.inviteTitle}
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{config.inviteTitle}</SheetTitle>
          <SheetDescription>{config.inviteDescription}</SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4"
          onSubmit={onSubmit}
        >
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="invite-name">Full name</FieldLabel>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name"
                required
                disabled={pending}
                autoComplete="name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@clinic.edu"
                required
                disabled={pending}
                autoComplete="email"
              />
            </Field>
            {config.showRoleFilter ? (
              <Field>
                <FieldLabel htmlFor="invite-employee-id">Employee ID</FieldLabel>
                <Input
                  id="invite-employee-id"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  placeholder="EMP-001"
                  disabled={pending}
                  autoComplete="off"
                />
              </Field>
            ) : null}
            {config.showRoleFilter ? (
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole((value as ManagedRole) ?? config.defaultCreateRole)
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full" aria-label="Staff role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {showLicenseNumber ? (
              <Field>
                <FieldLabel htmlFor="invite-license">License No.</FieldLabel>
                <Input
                  id="invite-license"
                  value={licenseNumber}
                  onChange={(event) => setLicenseNumber(event.target.value)}
                  placeholder="PRC license no."
                  disabled={pending}
                  autoComplete="off"
                />
              </Field>
            ) : null}
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Sending invite…" : "Send invite"}
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
