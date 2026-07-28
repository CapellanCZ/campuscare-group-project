"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { actionCompleteNurseIntake } from "@/lib/health/queue-server-actions"
import type { QueueTicketRow, SpecialtyStationId } from "@/lib/health/types"
import { ticketLabel } from "@/lib/health/mappers"
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
import { Textarea } from "@/components/ui/textarea"

type NurseIntakeSheetProps = {
  ticket: QueueTicketRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function NurseIntakeSheet({
  ticket,
  open,
  onOpenChange,
}: NurseIntakeSheetProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [chiefComplaint, setChiefComplaint] = useState("")
  const [bpSystolic, setBpSystolic] = useState("")
  const [bpDiastolic, setBpDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [temperatureC, setTemperatureC] = useState("")
  const [spo2, setSpo2] = useState("")
  const [intakeNotes, setIntakeNotes] = useState("")
  const [toStation, setToStation] = useState<SpecialtyStationId>("physician")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !ticket) return
    setChiefComplaint(ticket.chiefComplaint ?? "")
    setBpSystolic(
      ticket.vitals.bpSystolic != null ? String(ticket.vitals.bpSystolic) : ""
    )
    setBpDiastolic(
      ticket.vitals.bpDiastolic != null ? String(ticket.vitals.bpDiastolic) : ""
    )
    setHeartRate(
      ticket.vitals.heartRate != null ? String(ticket.vitals.heartRate) : ""
    )
    setTemperatureC(
      ticket.vitals.temperatureC != null
        ? String(ticket.vitals.temperatureC)
        : ""
    )
    setSpo2(ticket.vitals.spo2 != null ? String(ticket.vitals.spo2) : "")
    setIntakeNotes(ticket.intakeNotes ?? "")
    setToStation(
      ticket.station === "dentist" || ticket.station === "physician"
        ? ticket.station
        : "physician"
    )
    setError(null)
  }, [open, ticket])

  function reset() {
    setChiefComplaint("")
    setBpSystolic("")
    setBpDiastolic("")
    setHeartRate("")
    setTemperatureC("")
    setSpo2("")
    setIntakeNotes("")
    setToStation("physician")
    setError(null)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!ticket) return
    setError(null)

    startTransition(async () => {
      const result = await actionCompleteNurseIntake(ticket.ticketId, {
        chiefComplaint,
        bpSystolic: toNumber(bpSystolic),
        bpDiastolic: toNumber(bpDiastolic),
        heartRate: toNumber(heartRate),
        temperatureC: toNumber(temperatureC),
        spo2: toNumber(spo2),
        intakeNotes,
        toStation,
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? "Assigned to specialty queue")
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nurse intake & assign</SheetTitle>
          <SheetDescription>
            {ticket
              ? `Ticket ${ticketLabel(ticket.queueNumber, ticket.ticketCode)} · ${ticket.campusId ?? ticket.patientName}`
              : "Record vitals, then send to physician or dentist."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
          onSubmit={onSubmit}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="intake-complaint">Chief complaint</FieldLabel>
              <Textarea
                id="intake-complaint"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Fever, toothache, wound care…"
                disabled={pending}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="intake-sys">BP systolic</FieldLabel>
                <Input
                  id="intake-sys"
                  inputMode="numeric"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="intake-dia">BP diastolic</FieldLabel>
                <Input
                  id="intake-dia"
                  inputMode="numeric"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="intake-hr">Heart rate</FieldLabel>
                <Input
                  id="intake-hr"
                  inputMode="numeric"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="intake-temp">Temp (°C)</FieldLabel>
                <Input
                  id="intake-temp"
                  inputMode="decimal"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="intake-spo2">SpO₂ %</FieldLabel>
                <Input
                  id="intake-spo2"
                  inputMode="numeric"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="intake-notes">Intake notes</FieldLabel>
              <Textarea
                id="intake-notes"
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Assign specialty queue</FieldLabel>
              <Select
                value={toStation}
                onValueChange={(value) =>
                  setToStation((value as SpecialtyStationId) ?? "physician")
                }
              >
                <SelectTrigger className="w-full" aria-label="Specialty station">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physician">Physician</SelectItem>
                  <SelectItem value="dentist">Dentist</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <SheetFooter className="mt-auto px-0">
            <SheetClose render={<Button type="button" variant="outline" />}>
              Cancel
            </SheetClose>
            <Button type="submit" disabled={pending || !ticket}>
              {pending ? "Saving…" : "Save & assign"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
