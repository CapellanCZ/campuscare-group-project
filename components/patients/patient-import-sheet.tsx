"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { IconDownload, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react"

import { importPatientRecordsFromExcelAction } from "@/features/patients/actions"
import { downloadExcelTemplate } from "@/features/admin/lib/excel"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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

const TEMPLATE_HEADERS = [
  "patient_type",
  "student_id",
  "employee_id",
  "first_name",
  "middle_name",
  "last_name",
  "course",
  "year_level",
  "gender",
  "birth_date",
  "phone",
  "email",
] as const

const TEMPLATE_SAMPLE_ROWS = [
  [
    "student",
    "2024-001",
    "",
    "Juan",
    "Reyes",
    "Dela Cruz",
    "BSIT",
    "3",
    "male",
    "2004-05-12",
    "09171234567",
    "juan@example.com",
  ],
  [
    "faculty",
    "",
    "FAC-12",
    "Maria",
    "",
    "Santos",
    "College of Nursing",
    "",
    "female",
    "1988-02-01",
    "09179876543",
    "maria.santos@example.com",
  ],
]

type PatientImportSheetProps = {
  onImported: () => void
  toolbar?: boolean
}

export function PatientImportSheet({
  onImported,
  toolbar = false,
}: PatientImportSheetProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await importPatientRecordsFromExcelAction(formData)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      if (result.warning) toast.message(result.warning)
      setOpen(false)
      onImported()
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={toolbar ? "shrink-0" : undefined}
          />
        }
      >
        <IconUpload data-icon="inline-start" aria-hidden="true" />
        Import patients
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Import patients</SheetTitle>
          <SheetDescription>
            Upload an Excel roster of students and faculty into Patient Records.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4"
          onSubmit={onSubmit}
        >
          <p className="text-sm text-muted-foreground">
            Columns:{" "}
            <span className="font-medium text-foreground">
              patient_type, student_id, employee_id, first_name, last_name,
              course
            </span>{" "}
            (student | faculty)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={pending}
            onClick={() => {
              void downloadExcelTemplate(
                "patient-records-import-template.xlsx",
                [...TEMPLATE_HEADERS],
                TEMPLATE_SAMPLE_ROWS
              )
            }}
          >
            <IconDownload data-icon="inline-start" aria-hidden="true" />
            Download template
          </Button>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="import-patient-records">
              Excel file (.xlsx)
            </FieldLabel>
            <Input
              id="import-patient-records"
              name="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              required
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
              <IconFileSpreadsheet data-icon="inline-start" aria-hidden="true" />
              {pending ? "Importing…" : "Import roster"}
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
