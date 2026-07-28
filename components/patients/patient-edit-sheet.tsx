"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { updatePatientRecordAction } from "@/features/patients/actions"
import type { PatientRecord } from "@/types/patientRecord"

export function PatientEditSheet({
  open,
  patient,
  medicalOnly = false,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  patient: PatientRecord | null
  medicalOnly?: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bloodType, setBloodType] = useState("")
  const [allergies, setAllergies] = useState("")
  const [course, setCourse] = useState("")
  const [yearLevel, setYearLevel] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!patient) return
    setFullName(patient.fullName)
    setEmail(patient.email ?? "")
    setPhone(patient.phone ?? "")
    setBloodType(
      patient.bloodType === "—" || !patient.bloodType ? "" : patient.bloodType
    )
    setAllergies(
      patient.allergies === "None" || !patient.allergies ? "" : patient.allergies
    )
    setCourse(patient.course ?? "")
    setYearLevel(patient.yearLevel ?? "")
  }, [patient])

  function handleSave() {
    if (!patient) return
    startTransition(async () => {
      const result = await updatePatientRecordAction({
        id: patient.id,
        fullName: medicalOnly ? undefined : fullName,
        email: medicalOnly ? undefined : email,
        phone: medicalOnly ? undefined : phone,
        bloodType,
        allergies,
        course: medicalOnly ? undefined : course,
        yearLevel: medicalOnly ? undefined : yearLevel,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success("Patient record updated.")
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {medicalOnly ? "Update medical information" : "Edit patient"}
          </SheetTitle>
        </SheetHeader>

        {patient ? (
          <div className="space-y-4 px-4 pb-4">
            {!medicalOnly ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="patient-name">Full name</Label>
                  <Input
                    id="patient-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-email">Email</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-phone">Phone</Label>
                  <Input
                    id="patient-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-course">Course</Label>
                  <Input
                    id="patient-course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-year">Year level</Label>
                  <Input
                    id="patient-year"
                    value={yearLevel}
                    onChange={(e) => setYearLevel(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="patient-blood">Blood type</Label>
              <Input
                id="patient-blood"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-allergies">Allergies</Label>
              <Input
                id="patient-allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!patient || isPending} onClick={handleSave}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
