"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconCheck, IconLoader2 } from "@tabler/icons-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/features/common/components/page-header"
import { StateBlock } from "@/features/common/components/state-block"
import { saveDentalPatientChart } from "@/features/dentist/actions/dental-chart"
import { DentalPatientChartForm } from "@/features/dentist/components/dental-patient-chart"
import type {
  DentalConditionCode,
  DentalPatientChart,
  ToothId,
} from "@/features/dentist/types/dental-chart"
import { cn } from "@/lib/utils"

export function DentalConsultationMode({
  appointmentId,
  patientName,
  campusId,
  initialChart,
  readOnly = false,
}: {
  appointmentId: string
  patientName: string
  campusId: string | null
  initialChart: DentalPatientChart
  readOnly?: boolean
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [chart, setChart] = useState(initialChart)
  const [activeCode, setActiveCode] = useState<DentalConditionCode | null>(
    null
  )
  const [selectedTooth, setSelectedTooth] = useState<ToothId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setMounted(true)
  }, [])

  function persist(complete = false) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await saveDentalPatientChart({
        appointmentId,
        chart,
        complete,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (complete) {
        setMessage(
          "Consultation finished. Dental patient chart saved to the patient record and queue ticket closed."
        )
        router.push("/dentist/queue")
        router.refresh()
        return
      }
      setMessage("Dental chart draft saved. You can continue or complete later.")
      router.refresh()
    })
  }

  if (!mounted) {
    return <StateBlock state="loading" />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <PageHeader
        title={
          readOnly ? "Dental Patient Chart (Completed)" : "Dental Patient Chart"
        }
        description={
          campusId ? `${patientName} · ${campusId}` : patientName
        }
      />

      {readOnly ? (
        <Alert>
          <AlertTitle>Consultation completed</AlertTitle>
          <AlertDescription>
            This chart is read-only. Tooth markings, clinical findings, and
            treatment notes were saved with the patient record and can be
            reviewed anytime from this visit link.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <DentalPatientChartForm
        chart={chart}
        onChange={setChart}
        activeCode={activeCode}
        selectedTooth={selectedTooth}
        onSelectTooth={setSelectedTooth}
        onSelectCode={setActiveCode}
        readOnly={readOnly}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/dentist/queue"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Back to queue
            </Link>
            {readOnly ? (
              <Link
                href="/dentist/consultations"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Consultations
              </Link>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => persist(false)}
                >
                  {isPending ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : null}
                  Save draft
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => persist(true)}
                >
                  {isPending ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Complete consultation
                </Button>
              </>
            )}
          </div>
        }
      />
    </div>
  )
}
