"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { actionRegisterWalkIn } from "@/lib/health/queue-server-actions"
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
import { IconUserPlus } from "@tabler/icons-react"

export function WalkInSheet() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [patientName, setPatientName] = useState("")
  const [campusId, setCampusId] = useState("")
  const [consultationType, setConsultationType] = useState("Walk-in consultation")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!patientName.trim()) {
      setError("Enter the patient name.")
      return
    }

    startTransition(async () => {
      const result = await actionRegisterWalkIn({
        patientName,
        studentId: campusId || undefined,
        consultationType,
        // Phase 2: walk-ins always land on nurse first.
        providerQueue: "nurse",
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? "Walk-in registered")
      setOpen(false)
      setPatientName("")
      setCampusId("")
      setConsultationType("Walk-in consultation")
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <IconUserPlus data-icon="inline-start" />
        Register walk-in
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Register walk-in</SheetTitle>
          <SheetDescription>
            Check-in starts at the nurse station for vitals and specialty assignment.
          </SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col gap-4 px-4 py-4" onSubmit={onSubmit}>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="walkin-name">Patient name</FieldLabel>
            <Input
              id="walkin-name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
              required
              disabled={pending}
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
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="walkin-type">Consultation type</FieldLabel>
            <Input
              id="walkin-type"
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              disabled={pending}
            />
          </Field>
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
