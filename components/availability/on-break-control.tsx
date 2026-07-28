"use client"

import { useEffect, useState, useTransition } from "react"
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  clearClinicBreak,
  clearStaffBreak,
  loadMyBreakBundle,
  setClinicBreak,
  setStaffBreak,
} from "@/features/availability/actions/availability"
import type { BreakStatus } from "@/lib/availability/types"
import type { WebRole } from "@/lib/auth/types"

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultReopenLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  return toLocalInputValue(d)
}

type OnBreakControlProps = {
  role: WebRole | null | undefined
  /** `clinic` = nurse sets clinic-wide break; `staff` = personal break */
  mode: "clinic" | "staff"
  className?: string
}

export function OnBreakControl({ role, mode, className }: OnBreakControlProps) {
  const [clinicBreak, setClinicBreakState] = useState<BreakStatus | null>(null)
  const [staffBreak, setStaffBreakState] = useState<BreakStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [resumesLocal, setResumesLocal] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canClinic =
    mode === "clinic" && (role === "nurse" || role === "admin")
  const canStaff =
    mode === "staff" &&
    (role === "physician" || role === "dentist" || role === "nurse")

  const active =
    mode === "clinic"
      ? Boolean(clinicBreak?.isOnBreak)
      : Boolean(staffBreak?.isOnBreak)
  const resumesAt =
    mode === "clinic" ? clinicBreak?.resumesAt : staffBreak?.resumesAt

  useEffect(() => {
    if (!canClinic && !canStaff) return

    let cancelled = false

    void loadMyBreakBundle().then((bundle) => {
      if (cancelled) return
      setClinicBreakState(bundle.clinicBreak)
      setStaffBreakState(bundle.staffBreak)
    })

    return () => {
      cancelled = true
    }
  }, [canClinic, canStaff, role, mode])

  function refresh() {
    void loadMyBreakBundle().then((bundle) => {
      setClinicBreakState(bundle.clinicBreak)
      setStaffBreakState(bundle.staffBreak)
    })
  }

  if (!canClinic && !canStaff) return null

  function startBreak() {
    setError(null)
    const iso = new Date(resumesLocal).toISOString()
    startTransition(async () => {
      const result =
        mode === "clinic" ? await setClinicBreak(iso) : await setStaffBreak(iso)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      refresh()
    })
  }

  function endBreak() {
    setError(null)
    startTransition(async () => {
      const result =
        mode === "clinic" ? await clearClinicBreak() : await clearStaffBreak()
      if (!result.ok) {
        setError(result.error)
        return
      }
      refresh()
    })
  }

  return (
    <div className={className}>
      {active ? (
        <Alert variant="warning" className="mb-0 py-2">
          <AlertTitle className="text-sm">
            {mode === "clinic" ? "Clinic on break" : "You are on break"}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span>
              Reopens{" "}
              {resumesAt
                ? new Date(resumesAt).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                  })
                : "soon"}
            </span>
            <Button size="sm" variant="outline" disabled={isPending} onClick={endBreak}>
              <IconPlayerPlay data-icon="inline-start" />
              End break
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setResumesLocal(defaultReopenLocal())
            setError(null)
            setOpen(true)
          }}
        >
          <IconPlayerPause data-icon="inline-start" />
          On break
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "clinic" ? "Clinic on break" : "Go on break"}
            </DialogTitle>
            <DialogDescription>
              Patients cannot be scheduled or checked in until the reopen time
              you set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reopen-at">Reopen for transactions at</Label>
            <Input
              id="reopen-at"
              type="datetime-local"
              value={resumesLocal}
              onChange={(e) => setResumesLocal(e.target.value)}
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={startBreak}>
              Confirm break
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
