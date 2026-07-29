"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/features/announcements/actions"
import { announcementStatusLabel } from "@/features/announcements/lib/format"
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
  audience: "All students",
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
    if (mode === "edit" && announcement) {
      setForm({
        title: announcement.title,
        body: announcement.body,
        audience: announcement.audience,
        status: announcement.status,
        scheduledAt: toDatetimeLocalValue(announcement.scheduledAt),
      })
      return
    }
    setForm(emptyForm)
  }, [open, mode, announcement])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    startTransition(async () => {
      const scheduledAt = fromDatetimeLocalValue(form.scheduledAt)
      const payload = {
        title: form.title,
        body: form.body,
        audience: form.audience,
        status: form.status,
        scheduledAt,
      }

      const result =
        mode === "edit" && announcement
          ? await updateAnnouncementAction({ id: announcement.id, ...payload })
          : await createAnnouncementAction(payload)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "edit" ? "Announcement updated." : "Announcement created."
      )
      onOpenChange(false)
      onSaved(result.data)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit announcement" : "Add announcement"}
          </SheetTitle>
          <SheetDescription>
            Clinic notices for students and staff. Only admins can publish.
          </SheetDescription>
        </SheetHeader>

        <form
          id="announcement-form"
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-1"
          onSubmit={handleSubmit}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="announcement-title">Title</FieldLabel>
              <Input
                id="announcement-title"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Clinic hours update"
                required
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="announcement-body">Body</FieldLabel>
              <Textarea
                id="announcement-body"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="Write the notice details"
                rows={6}
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Audience</FieldLabel>
              <Select
                value={form.audience}
                onValueChange={(value) =>
                  updateField("audience", value ?? "All students")
                }
                disabled={pending}
              >
                <SelectTrigger className="w-full" aria-label="Audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {audience}
                    </SelectItem>
                  ))}
                  {form.audience &&
                  !(ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(
                    form.audience
                  ) ? (
                    <SelectItem value={form.audience}>{form.audience}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  updateField(
                    "status",
                    (value as AnnouncementStatus) ?? "draft"
                  )
                }
                disabled={pending}
              >
                <SelectTrigger className="w-full" aria-label="Status">
                  <SelectValue />
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
                  required
                  disabled={pending}
                />
              </Field>
            ) : null}
          </FieldGroup>
        </form>

        <SheetFooter className="mt-auto px-0 sm:flex-row">
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </SheetClose>
          <Button type="submit" form="announcement-form" disabled={pending}>
            {pending
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create announcement"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
