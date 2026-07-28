"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { SelectWithOtherField } from "@/components/shared/select-with-other-field"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { CONSULTATION_TYPE_OPTIONS } from "@/lib/health/form-options"
import { actionRegisterWalkIn } from "@/lib/health/queue-server-actions"
import { IconUserPlus } from "@tabler/icons-react"

const DEFAULT_CONSULTATION = "Walk-in consultation"

export function WalkInSheet() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [patientName, setPatientName] = useState("")
  const [campusId, setCampusId] = useState("")
  const [consultationType, setConsultationType] = useState(DEFAULT_CONSULTATION)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  function resetForm() {
    setPatientName("")
    setCampusId("")
    setConsultationType(DEFAULT_CONSULTATION)
    setError(null)
    setFormKey((key) => key + 1)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!patientName.trim()) {
      setError("Enter the patient name.")
      return
    }
    if (!consultationType.trim()) {
      setError("Choose a consultation type, or specify Other.")
      return
    }

    startTransition(async () => {
      const result = await actionRegisterWalkIn({
        patientName,
        studentId: campusId || undefined,
        consultationType: consultationType.trim(),
        providerQueue: "nurse",
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? "Walk-in registered")
      setOpen(false)
      resetForm()
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
      <SheetTrigger render={<Button variant="outline" />}>
        <IconUserPlus data-icon="inline-start" aria-hidden />
        Register walk-in
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b px-4 py-3 text-left">
          <SheetTitle>Register walk-in</SheetTitle>
          <SheetDescription className="text-xs">
            Check-in starts at the nurse station for vitals and specialty
            assignment.
          </SheetDescription>
        </SheetHeader>
        <form
          key={formKey}
          className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4"
          onSubmit={onSubmit}
        >
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="walkin-name">Patient name</FieldLabel>
            <Input
              id="walkin-name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
              required
              disabled={pending}
              autoComplete="name"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="walkin-campus">
              Student / employee ID (optional)
            </FieldLabel>
            <Input
              id="walkin-campus"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              placeholder="2023-000000 or FAC-12"
              disabled={pending}
              autoComplete="off"
            />
          </Field>
          <SelectWithOtherField
            id="walkin-type"
            label="Consultation type"
            options={CONSULTATION_TYPE_OPTIONS}
            value={consultationType}
            onValueChange={setConsultationType}
            placeholder="Select consultation type"
            otherPlaceholder="e.g. Vaccination, counseling…"
            disabled={pending}
            required
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Registering…" : "Register to nurse queue"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
