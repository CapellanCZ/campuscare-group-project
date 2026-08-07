"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ClinicCapacityRow } from "@/services/consultation-capacity"
import {
  loadClinicConsultationCapacitiesAction,
  saveClinicConsultationCapacityAction,
} from "@/features/admin/actions/consultation-capacity"
import { adminElevatedCardClassName } from "@/features/admin/lib/admin-surface"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { cn } from "@/lib/utils"

function slotsFromRows(rows: ClinicCapacityRow[]) {
  return {
    physician:
      rows.find((r) => r.providerType === "physician")?.maxDailySlots ?? 20,
    dentist:
      rows.find((r) => r.providerType === "dentist")?.maxDailySlots ?? 20,
  }
}

export function ConsultationCapacitySettings({
  initial,
  elevated = true,
}: {
  initial: ClinicCapacityRow[]
  elevated?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const initialSlots = slotsFromRows(initial)
  const [physicianSlots, setPhysicianSlots] = useState(
    String(initialSlots.physician)
  )
  const [dentistSlots, setDentistSlots] = useState(String(initialSlots.dentist))

  useStaffRealtimeRefresh(
    "staff-clinic-capacity",
    STAFF_REALTIME_TABLES.capacity,
    () => {
      void loadClinicConsultationCapacitiesAction()
        .then((rows) => {
          const next = slotsFromRows(rows)
          setPhysicianSlots(String(next.physician))
          setDentistSlots(String(next.dentist))
        })
        .catch(() => {
          /* keep local values if refresh fails */
        })
    }
  )

  function onSave() {
    startTransition(async () => {
      const result = await saveClinicConsultationCapacityAction({
        physician: Number(physicianSlots),
        dentist: Number(dentistSlots),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Consultation daily capacity saved.")
    })
  }

  return (
    <Card
      className={cn(
        elevated
          ? adminElevatedCardClassName
          : "min-w-0 shadow-none dark:ring-0"
      )}
    >
      <CardHeader>
        <CardTitle>Consultation queue capacity</CardTitle>
      </CardHeader>
      <CardContent className="grid max-w-md gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="cap-physician">Physician slots / day</FieldLabel>
          <Input
            id="cap-physician"
            inputMode="numeric"
            value={physicianSlots}
            onChange={(e) => setPhysicianSlots(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="cap-dentist">Dentist slots / day</FieldLabel>
          <Input
            id="cap-dentist"
            inputMode="numeric"
            value={dentistSlots}
            onChange={(e) => setDentistSlots(e.target.value)}
            disabled={pending}
          />
        </Field>
        <div className="sm:col-span-2">
          <Button type="button" disabled={pending} onClick={onSave}>
            Save capacity
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
