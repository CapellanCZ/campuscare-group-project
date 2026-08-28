"use client"

import { cn } from "@/lib/utils"
import type {
  DentalConditionCode,
  PrimaryToothLetter,
  ToothId,
  ToothMarking,
} from "@/features/dentist/types/dental-chart"
import {
  DENTAL_CONDITION_LEGEND,
  LOWER_TEETH,
  PRIMARY_LOWER_TEETH,
  PRIMARY_UPPER_TEETH,
  UPPER_TEETH,
} from "@/features/dentist/types/dental-chart"

type ToothKind = "molar" | "premolar" | "incisor"

const PERM_MOLARS = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32]
const PERM_PREMOLARS = [4, 5, 12, 13, 20, 21, 28, 29]
const PRIM_MOLARS: PrimaryToothLetter[] = [
  "A",
  "B",
  "I",
  "J",
  "K",
  "L",
  "S",
  "T",
]

function toothKind(id: ToothId): ToothKind {
  if (typeof id === "number") {
    if (PERM_MOLARS.includes(id)) return "molar"
    if (PERM_PREMOLARS.includes(id)) return "premolar"
    return "incisor"
  }
  if (PRIM_MOLARS.includes(id)) return "molar"
  return "incisor"
}

const TOOTH_PATHS: Record<ToothKind, string> = {
  molar:
    "M12,12 C12,12 10,35 12,45 C5,50 2,75 10,90 C18,98 42,98 50,90 C58,75 55,50 48,45 C50,35 48,12 48,12 C48,6 38,6 38,12 C38,25 34,30 30,30 C26,30 22,25 22,12 C22,6 12,6 12,12 Z",
  premolar:
    "M20,12 C20,6 40,6 40,12 C40,30 42,40 46,45 C52,55 52,80 44,90 C36,96 24,96 16,90 C8,80 8,55 14,45 C18,40 20,30 20,12 Z",
  incisor:
    "M25,12 C25,5 35,5 35,12 C35,35 37,45 42,50 C48,60 48,85 40,95 C35,99 25,99 20,95 C12,85 12,60 18,50 C23,45 25,35 25,12 Z",
}

function ToothSvg({
  id,
  arch,
  selected,
  marked,
  compact,
}: {
  id: ToothId
  arch: "upper" | "lower"
  selected: boolean
  marked: boolean
  compact?: boolean
}) {
  const kind = toothKind(id)
  const active = selected || marked

  return (
    <svg
      viewBox="0 0 60 100"
      className={cn(
        "w-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.06)] transition-all duration-300",
        compact ? "h-[3.75rem]" : "h-[4.5rem]",
        arch === "lower" && "rotate-180"
      )}
      aria-hidden
    >
      <path
        d={TOOTH_PATHS[kind]}
        className={cn(
          "stroke-[2] transition-all duration-300 group-hover:stroke-[3] group-hover:stroke-[#3498db]",
          active ? "stroke-[#c0392b]" : "stroke-[#bdc3c7]"
        )}
        fill={active ? "url(#tooth-selected)" : "url(#tooth-gloss)"}
      />
    </svg>
  )
}

function ToothTile({
  id,
  arch,
  marking,
  selected,
  activeCode,
  onSelect,
  onApply,
  readOnly,
  midGap,
  compact,
}: {
  id: ToothId
  arch: "upper" | "lower"
  marking: ToothMarking
  selected: boolean
  activeCode: DentalConditionCode | null
  onSelect: (id: ToothId) => void
  onApply: (id: ToothId, code: DentalConditionCode | null) => void
  readOnly?: boolean
  midGap?: boolean
  compact?: boolean
}) {
  const marked = Boolean(marking.code)
  const active = selected || marked

  return (
    <button
      type="button"
      disabled={readOnly}
      data-tooth-id={id}
      title={`Tooth ${id}${marking.code ? ` — ${marking.code}` : ""}`}
      onClick={() => {
        onSelect(id)
        if (readOnly) return
        if (activeCode) {
          onApply(id, marking.code === activeCode ? null : activeCode)
        }
      }}
      className={cn(
        "group relative flex flex-col items-center transition-transform duration-200",
        compact ? "w-[2.5rem] sm:w-[2.6rem]" : "w-[2.8rem] sm:w-[2.9rem]",
        midGap && "mr-6",
        !readOnly && "cursor-pointer hover:-translate-y-0.5",
        readOnly && "cursor-default"
      )}
    >
      {midGap ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 right-[-13px] bottom-0 w-0.5 rounded bg-[#cbd5e1]"
        />
      ) : null}

      {arch === "upper" ? (
        <>
          <span
            className={cn(
              "mb-3 text-[13px] font-bold tabular-nums text-[#95a5a6] transition-colors",
              active && "text-[#e74c3c]"
            )}
          >
            {id}
          </span>
          <span className="relative w-full">
            <ToothSvg
              id={id}
              arch="upper"
              selected={selected}
              marked={marked}
              compact={compact}
            />
            {marking.code ? (
              <span className="absolute top-1 left-1/2 z-10 -translate-x-1/2 rounded bg-[#c0392b] px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-white shadow-sm">
                {marking.code}
              </span>
            ) : null}
          </span>
        </>
      ) : (
        <>
          <span className="relative w-full">
            <ToothSvg
              id={id}
              arch="lower"
              selected={selected}
              marked={marked}
              compact={compact}
            />
            {marking.code ? (
              <span className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded bg-[#c0392b] px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-white shadow-sm">
                {marking.code}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "mt-3 text-[13px] font-bold tabular-nums text-[#95a5a6] transition-colors",
              active && "text-[#e74c3c]"
            )}
          >
            {id}
          </span>
        </>
      )}
    </button>
  )
}

function ArchRow({
  ids,
  arch,
  teeth,
  selectedTooth,
  activeCode,
  onSelectTooth,
  onChangeTooth,
  readOnly,
  midGapIndex,
  compact,
}: {
  ids: readonly ToothId[]
  arch: "upper" | "lower"
  teeth: Record<string, ToothMarking>
  selectedTooth: ToothId | null
  activeCode: DentalConditionCode | null
  onSelectTooth: (id: ToothId | null) => void
  onChangeTooth: (id: ToothId, marking: ToothMarking) => void
  readOnly?: boolean
  midGapIndex: number
  compact?: boolean
}) {
  function apply(id: ToothId, code: DentalConditionCode | null) {
    const prev = teeth[String(id)] ?? { code: null, note: "" }
    onChangeTooth(id, { ...prev, code })
  }

  return (
    <div
      className={cn(
        "flex justify-center gap-1.5",
        arch === "upper" ? "items-end" : "items-start"
      )}
    >
      {ids.map((id, index) => (
        <ToothTile
          key={String(id)}
          id={id}
          arch={arch}
          marking={teeth[String(id)] ?? { code: null, note: "" }}
          selected={selectedTooth === id}
          activeCode={activeCode}
          onSelect={onSelectTooth}
          onApply={apply}
          readOnly={readOnly}
          midGap={index === midGapIndex}
          compact={compact}
        />
      ))}
    </div>
  )
}

function ChartSection({
  title,
  upperIds,
  lowerIds,
  midGapIndex,
  compact,
  teeth,
  selectedTooth,
  activeCode,
  onSelectTooth,
  onChangeTooth,
  readOnly,
  paper,
  borderless,
}: {
  title?: string
  upperIds: readonly ToothId[]
  lowerIds: readonly ToothId[]
  midGapIndex: number
  compact?: boolean
  teeth: Record<string, ToothMarking>
  selectedTooth: ToothId | null
  activeCode: DentalConditionCode | null
  onSelectTooth: (id: ToothId | null) => void
  onChangeTooth: (id: ToothId, marking: ToothMarking) => void
  readOnly?: boolean
  paper?: boolean
  borderless?: boolean
}) {
  return (
    <section
      className={cn(
        borderless
          ? ""
          : paper
            ? "border border-neutral-900 bg-white p-2 sm:p-3"
            : "mb-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 last:mb-0"
      )}
    >
      {title ? (
        <h4
          className={cn(
            "text-center font-semibold tracking-wide uppercase",
            paper
              ? "mb-3 text-xs text-neutral-700"
              : "mb-5 text-lg text-[#34495e]"
          )}
        >
          {title}
        </h4>
      ) : null}
      <div className="overflow-x-auto pb-1">
        <div
          className={cn(
            "mx-auto inline-flex flex-col",
            compact ? "min-w-[18rem]" : "min-w-[48rem]"
          )}
        >
          <ArchRow
            ids={upperIds}
            arch="upper"
            teeth={teeth}
            selectedTooth={selectedTooth}
            activeCode={activeCode}
            onSelectTooth={onSelectTooth}
            onChangeTooth={onChangeTooth}
            readOnly={readOnly}
            midGapIndex={midGapIndex}
            compact={compact}
          />
          <div className={cn("h-px w-full", paper ? "bg-neutral-900" : "my-7 bg-[#cbd5e1]")} />
          <ArchRow
            ids={lowerIds}
            arch="lower"
            teeth={teeth}
            selectedTooth={selectedTooth}
            activeCode={activeCode}
            onSelectTooth={onSelectTooth}
            onChangeTooth={onChangeTooth}
            readOnly={readOnly}
            midGapIndex={midGapIndex}
            compact={compact}
          />
        </div>
      </div>
    </section>
  )
}

export function Odontogram({
  teeth,
  activeCode,
  selectedTooth,
  onSelectTooth,
  onChangeTooth,
  onSelectCode,
  readOnly = false,
  onClearMarks,
}: {
  teeth: Record<string, ToothMarking>
  activeCode: DentalConditionCode | null
  selectedTooth: ToothId | null
  onSelectTooth: (id: ToothId | null) => void
  onChangeTooth: (id: ToothId, marking: ToothMarking) => void
  onSelectCode: (code: DentalConditionCode | null) => void
  readOnly?: boolean
  onClearMarks?: () => void
}) {
  const markedCount = Object.values(teeth).filter((t) => t.code).length

  return (
    <div className="relative font-sans text-neutral-900">
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <linearGradient id="tooth-gloss" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fdfbfb" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient
            id="tooth-selected"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ff9a9e" />
            <stop offset="100%" stopColor="#fecfef" />
          </linearGradient>
        </defs>
      </svg>

      {!readOnly ? (
        <p className="mb-2 text-[10px] text-neutral-500">
          {activeCode
            ? `Active mark: ${activeCode} — click a tooth to apply or clear`
            : "Select a legend code, then click teeth to mark conditions"}
        </p>
      ) : null}

      {/* Main permanent chart */}
      <ChartSection
        upperIds={UPPER_TEETH}
        lowerIds={LOWER_TEETH}
        midGapIndex={7}
        teeth={teeth}
        selectedTooth={selectedTooth}
        activeCode={activeCode}
        onSelectTooth={onSelectTooth}
        onChangeTooth={onChangeTooth}
        readOnly={readOnly}
        paper
      />

      {/* Legend (left) + primary chart (right) */}
      <div className="mt-3 grid gap-3 border border-neutral-900 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border-r border-neutral-900 bg-white p-2 sm:p-3 lg:border-r">
          <p className="mb-2 text-center text-xs font-bold tracking-wide text-neutral-900 uppercase">
            Legend
          </p>
          <ul className="space-y-0 text-[10px] leading-snug sm:text-[11px]">
            {DENTAL_CONDITION_LEGEND.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    onSelectCode(activeCode === item.code ? null : item.code)
                  }
                  className={cn(
                    "flex w-full items-baseline gap-1 py-px text-left",
                    activeCode === item.code && "bg-neutral-100 font-semibold",
                    !readOnly && "hover:bg-neutral-50",
                    readOnly && "cursor-default"
                  )}
                >
                  <span className="min-w-[1.75rem] font-mono font-bold">
                    {item.code}
                  </span>
                  <span className="text-neutral-800">– {item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#ececec] p-2">
          <ChartSection
            upperIds={PRIMARY_UPPER_TEETH}
            lowerIds={PRIMARY_LOWER_TEETH}
            midGapIndex={4}
            compact
            teeth={teeth}
            selectedTooth={selectedTooth}
            activeCode={activeCode}
            onSelectTooth={onSelectTooth}
            onChangeTooth={onChangeTooth}
            readOnly={readOnly}
            paper
            borderless
          />
        </div>
      </div>

      {!readOnly ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
          <span>
            {markedCount > 0
              ? `${markedCount} tooth${markedCount === 1 ? "" : "s"} marked`
              : "No teeth marked"}
            {selectedTooth != null ? ` · selected ${selectedTooth}` : null}
          </span>
          <button
            type="button"
            onClick={() => {
              onClearMarks?.()
              onSelectTooth(null)
              onSelectCode(null)
            }}
            className="rounded border border-neutral-400 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-200"
          >
            Clear chart
          </button>
        </div>
      ) : null}
    </div>
  )
}
