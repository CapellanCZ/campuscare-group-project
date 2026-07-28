"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/features/announcements/actions"
import {
  announcementStatusLabel,
  formatAnnouncementDateTime,
} from "@/features/announcements/lib/format"
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
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_STATUSES,
  type Announcement,
  type AnnouncementStatus,
} from "@/types/announcement"

type FormState = {
  title: string
  body: string
  audience: string
  status: AnnouncementStatus
  scheduledAt: string
}

const emptyForm: FormState = {
  title: "",
  body: "",
  audience: ANNOUNCEMENT_AUDIENCES[0],
  status: "draft",
  scheduledAt: "",
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function announcementToForm(announcement: Announcement): FormState {
  return {
    title: announcement.title,
    body: announcement.body,
    audience: announcement.audience,
    status: announcement.status,
    scheduledAt: toDatetimeLocalValue(announcement.scheduledAt),
  }
}

function validateForm(form: FormState): string | null {
  if (!form.title.trim()) return "Title is required."
  if (form.status === "scheduled" && !form.scheduledAt.trim()) {
    return "Pick a schedule date and time for scheduled announcements."
  }
  return null
}

export function AnnouncementFormSheet({
  open,
  onOpenChange,
  mode,
  announcement,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  announcement: Announcement | null
  onSaved: (announcement: Announcement) => void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setForm(
      mode === "edit" && announcement
        ? announcementToForm(announcement)
        : emptyForm
    )
  }, [open, mode, announcement])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit() {
    const validationError = validateForm(form)
    if (validationError) {
      toast.error(validationError)
      return
    }

    startTransition(async () => {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        status: form.status,
        scheduledAt: fromDatetimeLocalValue(form.scheduledAt),
      }

      const result =
        mode === "create"
          ? await createAnnouncementAction(payload)
          : await updateAnnouncementAction({
              id: announcement!.id,
              ...payload,
            })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "create"
          ? "Announcement created."
          : "Announcement updated."
      )
      onSaved(result.data)
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Add announcement" : "Edit announcement"}
          </SheetTitle>
          <SheetDescription>
            Publish clinic notices for students and staff.
          </SheetDescription>
        </SheetHeader>

        <FieldGroup className="px-4 py-2">
          <Field>
            <FieldLabel htmlFor="announcement-title">Title</FieldLabel>
            <Input
              id="announcement-title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Clinic hours extended during finals week"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-body">Message</FieldLabel>
            <Textarea
              id="announcement-body"
              value={form.body}
              onChange={(event) => updateField("body", event.target.value)}
              placeholder="Share details students and staff should know."
              rows={6}
            />
          </Field>

          <Field>
            <FieldLabel>Audience</FieldLabel>
            <Select
              value={form.audience}
              onValueChange={(value) =>
                updateField("audience", value ?? ANNOUNCEMENT_AUDIENCES[0])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                  <SelectItem key={audience} value={audience}>
                    {audience}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onValueChange={(value) =>
                updateField("status", value as AnnouncementStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {announcementStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {form.status === "scheduled" ? (
            <Field>
              <FieldLabel htmlFor="announcement-scheduled-at">
                Schedule for
              </FieldLabel>
              <Input
                id="announcement-scheduled-at"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  updateField("scheduledAt", event.target.value)
                }
              />
              {form.scheduledAt ? (
                <p className="text-xs text-muted-foreground">
                  {formatAnnouncementDateTime(
                    fromDatetimeLocalValue(form.scheduledAt) ?? undefined
                  )}
                </p>
              ) : null}
            </Field>
          ) : null}
        </FieldGroup>

        <SheetFooter className="border-t">
          <Button disabled={pending} onClick={handleSubmit}>
            {pending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create announcement"
                : "Save changes"}
          </Button>
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
