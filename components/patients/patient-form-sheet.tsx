"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  createPatientRecordAction,
  updatePatientRecordAction,
} from "@/features/patients/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import type {
  CreatePatientRecordInput,
  PatientRecord,
} from "@/types/patientRecord"

type FormState = {
  studentId: string
  firstName: string
  middleName: string
  lastName: string
  course: string
  yearLevel: string
  gender: string
  birthDate: string
  bloodType: string
  allergies: string
  phone: string
  email: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  medicalConditions: string
  notes: string
  lastVisit: string
}

const emptyForm: FormState = {
  studentId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  course: "",
  yearLevel: "",
  gender: "",
  birthDate: "",
  bloodType: "",
  allergies: "",
  phone: "",
  email: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  medicalConditions: "",
  notes: "",
  lastVisit: "",
}

function toForm(patient: PatientRecord | null): FormState {
  if (!patient) return emptyForm
  return {
    studentId: patient.studentId,
    firstName: patient.firstName,
    middleName: patient.middleName ?? "",
    lastName: patient.lastName,
    course: patient.course,
    yearLevel: patient.yearLevel ?? "",
    gender: patient.gender ?? "",
    birthDate: patient.birthDate ?? "",
    bloodType: patient.bloodType ?? "",
    allergies: patient.allergies ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    medicalConditions: patient.medicalConditions ?? "",
    notes: patient.notes ?? "",
    lastVisit: patient.lastVisit ?? "",
  }
}

function toInput(form: FormState): CreatePatientRecordInput {
  return {
    studentId: form.studentId,
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
    course: form.course,
    yearLevel: form.yearLevel,
    gender: form.gender,
    birthDate: form.birthDate,
    bloodType: form.bloodType,
    allergies: form.allergies,
    phone: form.phone,
    email: form.email,
    address: form.address,
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
    medicalConditions: form.medicalConditions,
    notes: form.notes,
    lastVisit: form.lastVisit,
  }
}

export function PatientFormSheet({
  open,
  onOpenChange,
  mode,
  patient,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  patient: PatientRecord | null
  onSaved: (patient: PatientRecord) => void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setForm(toForm(mode === "edit" ? patient : null))
  }, [open, mode, patient])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    const input = toInput(form)
    startTransition(async () => {
      const result =
        mode === "edit" && patient
          ? await updatePatientRecordAction({ ...input, id: patient.id })
          : await createPatientRecordAction(input)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "edit" ? "Patient record updated." : "Patient record created."
      )
      onOpenChange(false)
      onSaved(result.data)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit patient" : "Create patient"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update the patient record. Student ID must remain unique."
              : "Add a student patient record. Student ID, first name, last name, and course are required."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="studentId">Student ID *</FieldLabel>
              <Input
                id="studentId"
                value={form.studentId}
                onChange={(e) => update("studentId", e.target.value)}
                placeholder="2021-04521"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">First name *</FieldLabel>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last name *</FieldLabel>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="middleName">Middle name</FieldLabel>
              <Input
                id="middleName"
                value={form.middleName}
                onChange={(e) => update("middleName", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="course">Course *</FieldLabel>
                <Input
                  id="course"
                  value={form.course}
                  onChange={(e) => update("course", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="yearLevel">Year level</FieldLabel>
                <Input
                  id="yearLevel"
                  value={form.yearLevel}
                  onChange={(e) => update("yearLevel", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="gender">Gender</FieldLabel>
                <Input
                  id="gender"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="birthDate">Birth date</FieldLabel>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => update("birthDate", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bloodType">Blood type</FieldLabel>
                <Input
                  id="bloodType"
                  value={form.bloodType}
                  onChange={(e) => update("bloodType", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="allergies">Allergies</FieldLabel>
                <Input
                  id="allergies"
                  value={form.allergies}
                  onChange={(e) => update("allergies", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="emergencyContactName">
                  Emergency contact
                </FieldLabel>
                <Input
                  id="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    update("emergencyContactName", e.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="emergencyContactPhone">
                  Emergency phone
                </FieldLabel>
                <Input
                  id="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    update("emergencyContactPhone", e.target.value)
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="medicalConditions">
                Medical conditions
              </FieldLabel>
              <Textarea
                id="medicalConditions"
                value={form.medicalConditions}
                onChange={(e) => update("medicalConditions", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastVisit">Last visit</FieldLabel>
              <Input
                id="lastVisit"
                type="date"
                value={form.lastVisit}
                onChange={(e) => update("lastVisit", e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        <SheetFooter>
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </SheetClose>
          <Button type="button" disabled={pending} onClick={handleSubmit}>
            {pending
              ? mode === "edit"
                ? "Saving…"
                : "Creating…"
              : mode === "edit"
                ? "Save changes"
                : "Create patient"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
