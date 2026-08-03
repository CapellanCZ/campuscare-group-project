"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { IconSearch, IconUsers } from "@tabler/icons-react"

import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { searchPatientRecordsAction } from "@/features/patients/actions"
import {
  patientCampusId,
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 350

export function QuickPatientSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [results, setResults] = useState<PatientRecord[]>([])
  const [selected, setSelected] = useState<PatientRecord | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim())
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (debounced.length < 2) return

    let cancelled = false
    startTransition(async () => {
      const result = await searchPatientRecordsAction(debounced, {
        page: 1,
        pageSize: 6,
      })
      if (cancelled) return
      if (!result.ok) {
        toast.error(result.error)
        setResults([])
        return
      }
      setResults(result.data.items)
    })

    return () => {
      cancelled = true
    }
  }, [debounced])

  const visibleResults = debounced.length < 2 ? [] : results
  const showHint = debounced.length < 2
  const showEmpty =
    !showHint && !pending && visibleResults.length === 0 && debounced.length >= 2
  const showSkeleton =
    !showHint && pending && visibleResults.length === 0

  return (
    <>
      <Card className={cn(panelCardClassName, "h-full", className)}>
        <CardHeader>
          <CardTitle className="text-base">Patient search</CardTitle>
          <CardDescription>ID or name.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-3">
          <div className="relative">
            <IconSearch
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-8"
              placeholder="ID or name…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search patients"
              autoComplete="off"
            />
          </div>

          {showHint ? (
            <p className="text-sm text-muted-foreground" role="status">
              Type at least 2 characters.
            </p>
          ) : showSkeleton ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-lg bg-muted/60"
                />
              ))}
            </div>
          ) : showEmpty ? (
            <Empty className="border-0 py-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconUsers aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No matches</EmptyTitle>
                <EmptyDescription>
                  Try another ID or spelling.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="space-y-1">
              {visibleResults.map((patient) => {
                const name = patientFullName(patient)
                const campusId = patientCampusId(patient)
                return (
                  <li key={patient.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start px-2 py-2 text-left"
                      onClick={() => setSelected(patient)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {name}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">
                          {patient.patientType}
                          {campusId ? ` · ${campusId}` : ""}
                          {patient.lastVisit
                            ? ` · last ${patient.lastVisit.slice(0, 10)}`
                            : ""}
                        </span>
                      </span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <PatientProfileSheet
        patient={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </>
  )
}
