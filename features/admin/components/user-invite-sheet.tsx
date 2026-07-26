"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconUserPlus } from "@tabler/icons-react"

import { createStaffUser } from "@/features/admin/actions/user-management"
import type { DirectoryConfig } from "@/features/admin/lib/user-directory-config"
import type { ManagedRole } from "@/features/admin/types/user-management"
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
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ManagedRole>(config.defaultCreateRole)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setFullName("")
    setEmail("")
    setRole(config.defaultCreateRole)
    setError(null)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createStaffUser({
        fullName,
        email,
        role,
        allowedRoles: [...config.roles],
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      if (result.warning) toast.message(result.warning)
      resetForm()
      setOpen(false)
      onCreated()
      router.refresh()
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
            variant={toolbar ? "outline" : "default"}
            size={toolbar ? "sm" : "default"}
            className={toolbar ? "h-9 shrink-0 gap-1.5 rounded-md" : undefined}
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
