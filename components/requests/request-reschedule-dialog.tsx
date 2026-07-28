"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ConsultationRequest } from "@/types/consultationRequest"

export function RequestRescheduleDialog({
  open,
  request,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  request: ConsultationRequest | null
  onOpenChange: (open: boolean) => void
  onSubmit: (input: {
    id: string
    appointmentDate: string
    appointmentTime: string
  }) => Promise<boolean>
}) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [saving, setSaving] = useState(false)

  function resetFromRequest(next: ConsultationRequest | null) {
    setDate(next?.preferredDate ?? "")
    setTime(next?.preferredTime ?? "")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && request) resetFromRequest(request)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule request</DialogTitle>
        </DialogHeader>
        {request ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {request.patientName} · {request.service}
            </p>
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!request || saving}
            onClick={async () => {
              if (!request) return
              setSaving(true)
              try {
                const ok = await onSubmit({
                  id: request.id,
                  appointmentDate: date,
                  appointmentTime: time,
                })
                if (ok) onOpenChange(false)
              } finally {
                setSaving(false)
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
