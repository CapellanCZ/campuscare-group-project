"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function normalizeStudentId(value: string): string {
  return value.trim()
}

export function PatientMedicalConfirmDialog({
  open,
  studentId,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  studentId: string
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const [typedId, setTypedId] = useState("")
  const expected = normalizeStudentId(studentId)
  const matches = normalizeStudentId(typedId) === expected && expected.length > 0

  useEffect(() => {
    if (!open) setTypedId("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm medical record update</DialogTitle>
          <DialogDescription>
            To confirm your changes, kindly put in the field the ID Number of
            the patient{" "}
            <strong className="text-foreground">{expected}</strong>
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="confirm-student-id">Student ID Number</FieldLabel>
          <Input
            id="confirm-student-id"
            value={typedId}
            onChange={(e) => setTypedId(e.target.value)}
            placeholder={expected}
            autoComplete="off"
            disabled={pending}
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!matches || pending}
            onClick={onConfirm}
          >
            {pending ? "Saving…" : "Confirm update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
