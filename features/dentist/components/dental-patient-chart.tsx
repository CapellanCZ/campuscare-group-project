"use client"

import Image from "next/image"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Odontogram } from "@/features/dentist/components/odontogram"
import type {
  BloodSugarLevel,
  DentalClinicalExam,
  DentalConditionCode,
  DentalDemographics,
  DentalPatientChart,
  ToothId,
  ToothMarking,
} from "@/features/dentist/types/dental-chart"
import {
  ALL_CHART_TOOTH_IDS,
  emptyToothMarking,
} from "@/features/dentist/types/dental-chart"
import { HSO_LOGO_PATH } from "@/features/reports/lib/export-letterhead"
import { cn } from "@/lib/utils"

function FormLetterhead({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src={HSO_LOGO_PATH}
        alt="NU Dasmariñas Health Services Office"
        width={compact ? 180 : 240}
        height={compact ? 48 : 64}
        className={cn(
          "shrink-0 object-contain",
          compact ? "h-12 w-auto" : "h-14 w-auto sm:h-16"
        )}
        priority
      />
      <p
        className={cn(
          "mt-2 max-w-xl leading-snug text-neutral-600",
          compact ? "text-xs" : "text-xs sm:text-sm"
        )}
      >
        Sampaloc 1 Bridge, SM Dasmariñas Governor&apos;s Dr., Dasmariñas Cavite,
        Philippines
      </p>
    </div>
  )
}

function UnderlineField({
  label,
  value,
  onChange,
  className,
  readOnly,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
  readOnly?: boolean
}) {
  return (
    <label className={cn("flex min-w-0 items-end gap-2 text-sm", className)}>
      <span className="shrink-0 pb-1 font-medium text-neutral-900">{label}</span>
      <input
        suppressHydrationWarning
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 min-w-0 flex-1 rounded-none border-0 border-b border-neutral-800 bg-transparent px-0.5 text-sm outline-none focus-visible:border-neutral-900"
      />
    </label>
  )
}

function ExamCheckbox({
  checked,
  label,
  readOnly,
  onChange,
}: {
  checked: boolean
  label?: string
  readOnly?: boolean
  onChange: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <input
        type="checkbox"
        className="size-3.5 rounded-none border-neutral-800 accent-neutral-900"
        checked={checked}
        disabled={readOnly}
        onChange={onChange}
      />
      {label ? (
        <span className="text-center text-[10px] leading-tight text-neutral-900 sm:text-xs">
          {label}
        </span>
      ) : null}
    </div>
  )
}

function ClinicalExamGrid({
  clinical,
  readOnly,
  onPatch,
}: {
  clinical: DentalClinicalExam
  readOnly?: boolean
  onPatch: (patch: Partial<DentalClinicalExam>) => void
}) {
  const gridClass =
    "grid grid-cols-[10.5rem_repeat(3,minmax(0,1fr))] items-start justify-items-center gap-x-3 [&>span:first-child]:justify-self-start"

  function toggleSingle<T extends string>(
    field: keyof DentalClinicalExam,
    current: T | "",
    value: T
  ) {
    onPatch({ [field]: current === value ? "" : value } as Partial<DentalClinicalExam>)
  }

  return (
    <div className="border-y border-neutral-300">
      <div className={cn(gridClass, "border-b border-neutral-200 py-3")}>
        <span className="pt-0.5 text-sm font-medium text-neutral-900">
          Consistency of Gingiva
        </span>
        {(
          [
            { value: "smooth", label: "smooth" },
            { value: "firm", label: "firm" },
            { value: "hyperplastic", label: "hyperplastic" },
          ] as const
        ).map((opt) => (
          <ExamCheckbox
            key={opt.value}
            label={opt.label}
            checked={clinical.gingivaConsistency === opt.value}
            readOnly={readOnly}
            onChange={() =>
              toggleSingle("gingivaConsistency", clinical.gingivaConsistency, opt.value)
            }
          />
        ))}
      </div>

      <div className={cn(gridClass, "min-h-8 border-b border-neutral-200 py-2")}>
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={cn(gridClass, "border-b border-neutral-200 py-3")}>
        <span className="pt-0.5 text-sm font-medium text-neutral-900">
          Oral Hygiene
        </span>
        {(
          [
            { value: "bad", label: "bad" },
            { value: "good", label: "good" },
            { value: "fair", label: "fair" },
          ] as const
        ).map((opt) => (
          <ExamCheckbox
            key={opt.value}
            label={opt.label}
            checked={clinical.oralHygiene === opt.value}
            readOnly={readOnly}
            onChange={() =>
              toggleSingle("oralHygiene", clinical.oralHygiene, opt.value)
            }
          />
        ))}
      </div>

      <div className={cn(gridClass, "min-h-8 border-b border-neutral-200 py-2")}>
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={cn(gridClass, "border-b border-neutral-200 py-3")}>
        <span className="pt-0.5 text-sm font-medium text-neutral-900">
          Gingival Color
        </span>
        <ExamCheckbox
          label="pink"
          checked={clinical.gingivalColor === "pink"}
          readOnly={readOnly}
          onChange={() =>
            toggleSingle("gingivalColor", clinical.gingivalColor, "pink")
          }
        />
        <ExamCheckbox
          label="bright red"
          checked={clinical.gingivalColor === "bright_red"}
          readOnly={readOnly}
          onChange={() =>
            toggleSingle("gingivalColor", clinical.gingivalColor, "bright_red")
          }
        />
        <span />
      </div>

      <div className={cn(gridClass, "border-b border-neutral-200 py-3")}>
        <span className="pt-0.5 text-sm font-medium text-neutral-900">
          Lymph Nodes
        </span>
        <ExamCheckbox
          label="not palpable"
          checked={clinical.lymphNodes === "not_palpable"}
          readOnly={readOnly}
          onChange={() =>
            toggleSingle("lymphNodes", clinical.lymphNodes, "not_palpable")
          }
        />
        <ExamCheckbox
          label="palpable"
          checked={clinical.lymphNodes === "palpable"}
          readOnly={readOnly}
          onChange={() =>
            toggleSingle("lymphNodes", clinical.lymphNodes, "palpable")
          }
        />
        <span />
      </div>

      <div className={cn(gridClass, "py-3")}>
        <span className="pt-0.5 text-sm font-medium text-neutral-900">Tongue</span>
        <ExamCheckbox
          label="normal"
          checked={clinical.tongue === "normal"}
          readOnly={readOnly}
          onChange={() => toggleSingle("tongue", clinical.tongue, "normal")}
        />
        <ExamCheckbox
          label="coated"
          checked={clinical.tongue === "coated"}
          readOnly={readOnly}
          onChange={() => toggleSingle("tongue", clinical.tongue, "coated")}
        />
        <span />
      </div>
    </div>
  )
}

export function DentalPatientChartForm({
  chart,
  onChange,
  activeCode,
  selectedTooth,
  onSelectTooth,
  onSelectCode,
  readOnly = false,
  footer,
}: {
  chart: DentalPatientChart
  onChange: (next: DentalPatientChart) => void
  activeCode: DentalConditionCode | null
  selectedTooth: ToothId | null
  onSelectTooth: (id: ToothId | null) => void
  onSelectCode: (code: DentalConditionCode | null) => void
  readOnly?: boolean
  footer?: React.ReactNode
}) {
  function patchDemographics(patch: Partial<DentalDemographics>) {
    onChange({
      ...chart,
      demographics: { ...chart.demographics, ...patch },
    })
  }

  function patchClinical(patch: Partial<DentalClinicalExam>) {
    onChange({
      ...chart,
      clinical: { ...chart.clinical, ...patch },
    })
  }

  function onChangeTooth(id: ToothId, marking: ToothMarking) {
    onChange({
      ...chart,
      teeth: { ...chart.teeth, [String(id)]: marking },
    })
  }

  function clearToothMarks() {
    const next: Record<string, ToothMarking> = {}
    for (const id of ALL_CHART_TOOTH_IDS) {
      next[String(id)] = emptyToothMarking()
    }
    onChange({ ...chart, teeth: next })
  }

  const d = chart.demographics
  const c = chart.clinical

  return (
    <div
      suppressHydrationWarning
      className="overflow-hidden border border-neutral-400 bg-white font-sans text-neutral-900 shadow-sm"
    >
      {/* Page 1 — NUD-ADM-HSO-F010 */}
      <div className="border-b border-neutral-400 bg-white px-4 py-4 sm:px-6">
        <FormLetterhead />

        <div className="relative mt-4 border-2 border-neutral-900 px-3 py-2 text-center">
          <h3 className="text-lg font-bold tracking-[0.15em] text-neutral-900 uppercase sm:text-xl">
            Patient Chart
          </h3>
          <div className="absolute top-1 right-2 border border-neutral-700 px-1.5 py-0.5 text-[9px] leading-tight text-neutral-700 sm:text-[10px]">
            <div>NUD-ADM-HSO-F010</div>
            <div>ver 2025</div>
          </div>
        </div>
      </div>

      <div className="space-y-0 px-4 py-4 sm:px-6">
        {/* Demographics */}
        <section className="space-y-3 border-b border-neutral-300 bg-white py-3">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <UnderlineField
              label="Name:"
              value={d.name}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ name: v })}
              className="min-w-[12rem] flex-[2]"
            />
            <UnderlineField
              label="Age:"
              value={d.age}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ age: v })}
              className="w-20"
            />
            <UnderlineField
              label="Sex:"
              value={d.sex}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ sex: v })}
              className="w-20"
            />
            <UnderlineField
              label="Civil Status:"
              value={d.civilStatus}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ civilStatus: v })}
              className="min-w-[8rem] flex-1"
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <UnderlineField
              label="Student ID Number:"
              value={d.studentId}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ studentId: v })}
              className="min-w-[12rem] flex-[2]"
            />
            <UnderlineField
              label="Yr level / Grade:"
              value={d.yearLevel}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ yearLevel: v })}
              className="min-w-[8rem] flex-1"
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <UnderlineField
              label="Strand / Program:"
              value={d.strandProgram}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ strandProgram: v })}
              className="min-w-[12rem] flex-[2]"
            />
            <UnderlineField
              label="Section:"
              value={d.section}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ section: v })}
              className="min-w-[8rem] flex-1"
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <UnderlineField
              label="Office Address:"
              value={d.officeAddress}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ officeAddress: v })}
              className="min-w-[12rem] flex-[2]"
            />
            <UnderlineField
              label="Tel No.:"
              value={d.telNo}
              readOnly={readOnly}
              onChange={(v) => patchDemographics({ telNo: v })}
              className="min-w-[8rem] flex-1"
            />
          </div>
        </section>

        {/* Odontogram — interactive chart (legend included in component) */}
        <section className="mt-4">
          <Odontogram
            teeth={chart.teeth}
            activeCode={activeCode}
            selectedTooth={selectedTooth}
            onSelectTooth={onSelectTooth}
            onChangeTooth={onChangeTooth}
            onSelectCode={onSelectCode}
            onClearMarks={clearToothMarks}
            readOnly={readOnly}
          />
        </section>

        {/* Page 2 — clinical examination */}
        <section className="mt-8 border-t-2 border-neutral-400 bg-white pt-6">
          <FormLetterhead compact />

          <div className="mt-6 space-y-4 px-1 sm:px-2">
          <UnderlineField
            label="Case History"
            value={c.caseHistory}
            readOnly={readOnly}
            onChange={(v) => patchClinical({ caseHistory: v })}
          />
          <UnderlineField
            label="Chief Complaint"
            value={c.chiefComplaint}
            readOnly={readOnly}
            onChange={(v) => patchClinical({ chiefComplaint: v })}
          />

          <p className="text-sm font-medium text-neutral-900">Check Each Block</p>

          <ClinicalExamGrid
            clinical={c}
            readOnly={readOnly}
            onPatch={patchClinical}
          />

          <div className="space-y-3 pt-2">
            <UnderlineField
              label="Occlusion"
              value={c.occlusion}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ occlusion: v })}
            />
            <UnderlineField
              label="Cl. I type"
              value={c.classIType}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ classIType: v })}
            />
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <UnderlineField
                label="Cl. II Division"
                value={c.classIIDivision}
                readOnly={readOnly}
                onChange={(v) => patchClinical({ classIIDivision: v })}
                className="min-w-[10rem] flex-1"
              />
              <UnderlineField
                label="Subdivision"
                value={c.classIISubdivision}
                readOnly={readOnly}
                onChange={(v) => patchClinical({ classIISubdivision: v })}
                className="min-w-[8rem] flex-1"
              />
              <UnderlineField
                label="Type"
                value={c.classIIType}
                readOnly={readOnly}
                onChange={(v) => patchClinical({ classIIType: v })}
                className="min-w-[8rem] flex-1"
              />
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <UnderlineField
                label="Cl. III Division"
                value={c.classIIIDivision}
                readOnly={readOnly}
                onChange={(v) => patchClinical({ classIIIDivision: v })}
                className="min-w-[10rem] flex-1"
              />
              <UnderlineField
                label="Subdivision"
                value={c.classIIISubdivision}
                readOnly={readOnly}
                onChange={(v) => patchClinical({ classIIISubdivision: v })}
                className="min-w-[8rem] flex-1"
              />
            </div>
            <div className="h-7 border-b border-neutral-800" />
          </div>

          <div className="space-y-3 border-t border-neutral-300 pt-4">
            <UnderlineField
              label="Operations if any"
              value={c.operations}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ operations: v })}
            />
            <div className="grid grid-cols-[10.5rem_minmax(0,1fr)] items-end gap-x-3 py-1">
              <span className="pb-1 text-sm font-medium text-neutral-900">
                Blood Sugar
              </span>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "normal", label: "Normal" },
                    { value: "high", label: "High" },
                    { value: "low", label: "Low" },
                  ] as const
                ).map((opt) => {
                  const checked = c.bloodSugar === opt.value
                  return (
                    <div key={opt.value} className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          patchClinical({
                            bloodSugar: checked
                              ? ""
                              : (opt.value as BloodSugarLevel),
                          })
                        }
                        className={cn(
                          "h-7 w-full border-b border-neutral-800 bg-transparent",
                          checked && "bg-neutral-100"
                        )}
                        aria-label={opt.label}
                      />
                      <span className="text-center text-xs text-neutral-900">
                        {opt.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <UnderlineField
              label="Bleeding Time (Value)"
              value={c.bleedingTime}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ bleedingTime: v })}
            />
            <UnderlineField
              label="Clotting Time (Value)"
              value={c.clottingTime}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ clottingTime: v })}
            />
            <UnderlineField
              label="Radiographic Interpretation"
              value={c.radiographicInterpretation}
              readOnly={readOnly}
              onChange={(v) =>
                patchClinical({ radiographicInterpretation: v })
              }
            />
            <UnderlineField
              label="Allergy"
              value={c.allergy}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ allergy: v })}
            />
            <UnderlineField
              label="Blood Diseases"
              value={c.bloodDiseases}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ bloodDiseases: v })}
            />
            <UnderlineField
              label="Fainting"
              value={c.fainting}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ fainting: v })}
            />
            <UnderlineField
              label="B.P"
              value={c.bloodPressure}
              readOnly={readOnly}
              onChange={(v) => patchClinical({ bloodPressure: v })}
            />
          </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 border-t border-neutral-300 bg-white p-3 sm:grid-cols-3 sm:p-4">
          <div className="space-y-1.5">
            <Label htmlFor="dental-dx">Diagnosis</Label>
            <Textarea
              id="dental-dx"
              value={chart.diagnosis}
              readOnly={readOnly}
              onChange={(e) =>
                onChange({ ...chart, diagnosis: e.target.value })
              }
              rows={3}
              className="rounded-none border-neutral-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dental-tx">Treatment notes</Label>
            <Textarea
              id="dental-tx"
              value={chart.treatmentNotes}
              readOnly={readOnly}
              onChange={(e) =>
                onChange({ ...chart, treatmentNotes: e.target.value })
              }
              rows={3}
              className="rounded-none border-neutral-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dental-rx">Prescription</Label>
            <Textarea
              id="dental-rx"
              value={chart.prescription}
              readOnly={readOnly}
              onChange={(e) =>
                onChange({ ...chart, prescription: e.target.value })
              }
              rows={3}
              className="rounded-none border-neutral-400"
            />
          </div>
        </section>

        {footer ? (
          <div className="border-t border-neutral-300 bg-white px-4 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
