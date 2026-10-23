"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconClockHour4,
  IconEdit,
  IconGripVertical,
  IconLayoutList,
  IconPlayerPlay,
  IconPlus,
  IconUserOff,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { AnimatedCount } from "@/components/shared/animated-count"
import {
  QUEUE_PAGE_SIZE_OPTIONS,
  type QueuePageSize,
} from "@/components/queue/queue-status-toolbar"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"

/** HTML5 drag payload from Upcoming → Waiting. */
export const SCHEDULED_TO_WAITING_MIME =
  "application/x-campuscare-scheduled-ticket"

export type QueueStatusTableId =
  | "waiting"
  | "emergency"
  | "in_progress"
  | "skipped"
  | "completed"

/** Nurse triage vs specialty station — different tables to avoid mix-ups. */
export type QueueStatusTablesVariant = "nurse" | "specialty"

export type QueueStatusTableSection = {
  id: QueueStatusTableId
  title: string
  emptyTitle: string
  rows: QueueTicketRow[]
}

type StatusIcon = ComponentType<{ className?: string; stroke?: number }>

const NURSE_CATALOG: Array<{
  id: QueueStatusTableId
  title: string
  icon: StatusIcon
}> = [
  { id: "waiting", title: "Waiting", icon: IconClockHour4 },
  { id: "emergency", title: "Emergencies", icon: IconAlertTriangle },
  { id: "skipped", title: "Skipped / No Show", icon: IconUserOff },
  { id: "completed", title: "Completed", icon: IconCheck },
]

const SPECIALTY_CATALOG: Array<{
  id: QueueStatusTableId
  title: string
  icon: StatusIcon
}> = [
  // Waiting lives in the right-rail panel (like nurse Patients), not here.
  { id: "in_progress", title: "In progress", icon: IconPlayerPlay },
  { id: "skipped", title: "Skipped / No Show", icon: IconUserOff },
  { id: "completed", title: "Completed visits", icon: IconCheck },
]

const STATUS_ICON: Record<QueueStatusTableId, StatusIcon> = {
  waiting: IconClockHour4,
  emergency: IconAlertTriangle,
  in_progress: IconPlayerPlay,
  skipped: IconUserOff,
  completed: IconCheck,
}

/** Icon-only accent — titles stay neutral to match the rest of the queue UI. */
const STATUS_HEADER_ICON: Record<QueueStatusTableId, string> = {
  emergency: "text-destructive",
  waiting: "text-muted-foreground",
  in_progress: "text-primary",
  skipped: "text-muted-foreground",
  completed: "text-muted-foreground",
}

const DEFAULT_VISIBLE: Record<QueueStatusTablesVariant, QueueStatusTableId[]> = {
  nurse: ["waiting", "emergency", "skipped", "completed"],
  specialty: ["in_progress", "skipped", "completed"],
}

function catalogFor(variant: QueueStatusTablesVariant) {
  return variant === "specialty" ? SPECIALTY_CATALOG : NURSE_CATALOG
}

function visibleStorageKey(variant: QueueStatusTablesVariant) {
  return variant === "specialty"
    ? "campuscare:queue-status-tables-visible:specialty:v1"
    : "campuscare:queue-status-tables-visible:v2"
}

function pageSizesStorageKey(variant: QueueStatusTablesVariant) {
  return variant === "specialty"
    ? "campuscare:queue-status-table-page-sizes:specialty:v1"
    : "campuscare:queue-status-table-page-sizes"
}

function readStoredVisible(
  variant: QueueStatusTablesVariant
): QueueStatusTableId[] {
  const fallback = DEFAULT_VISIBLE[variant]
  const catalog = catalogFor(variant)
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.sessionStorage.getItem(visibleStorageKey(variant))
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    const ids = parsed.filter((id): id is QueueStatusTableId =>
      catalog.some((item) => item.id === id)
    )
    return ids.length > 0 ? ids : fallback
  } catch {
    return fallback
  }
}

function writeStoredVisible(
  variant: QueueStatusTablesVariant,
  ids: QueueStatusTableId[]
) {
  try {
    window.sessionStorage.setItem(
      visibleStorageKey(variant),
      JSON.stringify(ids)
    )
  } catch {
    /* ignore */
  }
}

function readStoredPageSizes(
  variant: QueueStatusTablesVariant
): Partial<Record<QueueStatusTableId, QueuePageSize>> {
  const catalog = catalogFor(variant)
  if (typeof window === "undefined") return {}
  try {
    const raw = window.sessionStorage.getItem(pageSizesStorageKey(variant))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    const next: Partial<Record<QueueStatusTableId, QueuePageSize>> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (
        catalog.some((item) => item.id === key) &&
        QUEUE_PAGE_SIZE_OPTIONS.includes(value as QueuePageSize)
      ) {
        next[key as QueueStatusTableId] = value as QueuePageSize
      }
    }
    return next
  } catch {
    return {}
  }
}

function writeStoredPageSizes(
  variant: QueueStatusTablesVariant,
  sizes: Partial<Record<QueueStatusTableId, QueuePageSize>>
) {
  try {
    window.sessionStorage.setItem(
      pageSizesStorageKey(variant),
      JSON.stringify(sizes)
    )
  } catch {
    /* ignore */
  }
}

function PageSizeMenu({
  pageSize,
  onChange,
  label,
}: {
  pageSize: QueuePageSize
  onChange: (size: QueuePageSize) => void
  label: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="size-8"
            aria-label={`${label}: show ${pageSize} patients`}
            title={`Show ${pageSize} patients`}
            onClick={(event) => event.stopPropagation()}
          />
        }
      >
        <IconLayoutList className="size-4" stroke={1.75} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        onClick={(event) => event.stopPropagation()}
      >
        {QUEUE_PAGE_SIZE_OPTIONS.map((size) => (
          <DropdownMenuItem
            key={size}
            className="justify-between gap-3"
            onClick={() => onChange(size)}
          >
            <span>{size === 1 ? "1 patient" : `${size} patients`}</span>
            {pageSize === size ? (
              <IconCheck className="size-3.5 opacity-70" stroke={1.75} />
            ) : (
              <span className="size-3.5" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SortableStatusSection({
  section,
  pageSize,
  page,
  editing,
  onPageChange,
  onPageSizeChange,
  renderRow,
  onAcceptScheduledDrop,
}: {
  section: QueueStatusTableSection
  pageSize: QueuePageSize
  page: number
  editing: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: QueuePageSize) => void
  renderRow: (row: QueueTicketRow, index: number) => ReactNode
  onAcceptScheduledDrop?: (ticketId: string) => void
}) {
  const StatusIcon = STATUS_ICON[section.id] ?? IconClipboardList
  const iconTone = STATUS_HEADER_ICON[section.id]
  const count = section.rows.length
  const hasRows = count > 0
  const [open, setOpen] = useState(hasRows)
  const [fresh, setFresh] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const prevCount = useRef<number | null>(null)
  const acceptsScheduledDrop =
    section.id === "waiting" && Boolean(onAcceptScheduledDrop)

  useEffect(() => {
    const previous = prevCount.current
    prevCount.current = count
    if (previous == null) return

    if (count > previous) {
      setOpen(true)
      setFresh(true)
      const id = window.setTimeout(() => setFresh(false), 2800)
      return () => window.clearTimeout(id)
    }

    if (count === 0 && previous > 0) {
      setOpen(false)
      setFresh(false)
    }
  }, [count])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !editing })

  // Translate only — full CSS.Transform can squash/stretch the row while dragging.
  const style: CSSProperties = {
    transform: editing ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: "relative",
    transformOrigin: "0 0",
    opacity: isDragging ? 0.96 : 1,
    boxShadow: isDragging
      ? "0 10px 28px -12px rgb(0 0 0 / 0.22)"
      : undefined,
  }

  const pageCount = Math.max(1, Math.ceil(section.rows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = section.rows.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  )
  const panelId = `queue-status-panel-${section.id}`

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-labelledby={`queue-status-${section.id}`}
      className={cn(
        "min-w-0 border-b bg-background will-change-transform",
        isDragging && "relative z-20 cursor-grabbing ring-1 ring-border",
        dropActive && "ring-2 ring-primary/40"
      )}
      onDragEnter={
        acceptsScheduledDrop
          ? (event) => {
              event.preventDefault()
              setDropActive(true)
            }
          : undefined
      }
      onDragOver={
        acceptsScheduledDrop
          ? (event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
              setDropActive(true)
            }
          : undefined
      }
      onDragLeave={
        acceptsScheduledDrop
          ? (event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return
              }
              setDropActive(false)
            }
          : undefined
      }
      onDrop={
        acceptsScheduledDrop
          ? (event) => {
              event.preventDefault()
              setDropActive(false)
              const ticketId =
                event.dataTransfer.getData(SCHEDULED_TO_WAITING_MIME) ||
                event.dataTransfer.getData("text/plain")
              if (ticketId) onAcceptScheduledDrop?.(ticketId)
            }
          : undefined
      }
    >
      <div
        className={cn(
          "flex items-center gap-1 bg-muted/20 px-2 py-2 transition-colors duration-500 sm:px-3",
          open && "border-b",
          fresh && "bg-primary/[0.07]",
          dropActive && "bg-primary/10"
        )}
      >
        {editing ? (
          <button
            type="button"
            className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={`Drag to reorder ${section.title}`}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical className="size-4" stroke={1.75} aria-hidden />
          </button>
        ) : null}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/60"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((value) => !value)
            setFresh(false)
          }}
        >
          <h3
            id={`queue-status-${section.id}`}
            className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-foreground"
          >
            <StatusIcon
              className={cn("size-3.5 shrink-0", iconTone)}
              stroke={1.75}
              aria-hidden
            />
            <span className="truncate">{section.title}</span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-[color,background-color,box-shadow] duration-300",
                fresh
                  ? "bg-primary/15 font-medium text-primary ring-1 ring-primary/25"
                  : "bg-transparent font-normal text-muted-foreground"
              )}
            >
              <AnimatedCount value={count} />
              <span>listed</span>
              {fresh ? (
                <span
                  className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </span>
          </h3>
          <IconChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            stroke={1.75}
            aria-hidden
          />
        </button>

        {editing ? (
          <PageSizeMenu
            pageSize={pageSize}
            label={section.title}
            onChange={onPageSizeChange}
          />
        ) : null}
      </div>

      {open ? (
        <div id={panelId}>
          {pageRows.length === 0 ? (
            <Empty className="border-0 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconClipboardList stroke={1.75} aria-hidden />
                </EmptyMedia>
                <EmptyTitle>{section.emptyTitle}</EmptyTitle>
                <EmptyDescription>
                  Patients in this status appear in this table.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="divide-y divide-border">
                {pageRows.map((row, rowIndex) =>
                  renderRow(row, safePage * pageSize + rowIndex)
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 sm:px-6">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Showing {safePage * pageSize + 1}–
                  {Math.min((safePage + 1) * pageSize, section.rows.length)} of{" "}
                  {section.rows.length}
                  {pageCount > 1
                    ? ` · Page ${safePage + 1} of ${pageCount}`
                    : ""}
                </p>
                {pageCount > 1 ? (
                  <nav
                    className="flex items-center gap-3"
                    aria-label={`${section.title} pages`}
                  >
                    <button
                      type="button"
                      disabled={safePage <= 0}
                      onClick={() => onPageChange(Math.max(0, safePage - 1))}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                        "hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      )}
                    >
                      <IconChevronLeft
                        className="size-3.5"
                        stroke={1.75}
                        aria-hidden
                      />
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= pageCount - 1}
                      onClick={() =>
                        onPageChange(Math.min(pageCount - 1, safePage + 1))
                      }
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                        "hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      )}
                    >
                      Next
                      <IconChevronRight
                        className="size-3.5"
                        stroke={1.75}
                        aria-hidden
                      />
                    </button>
                  </nav>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}

export function QueueStatusTables({
  sections,
  renderRow,
  className,
  onAcceptScheduledDrop,
  variant = "nurse",
}: {
  sections: QueueStatusTableSection[]
  renderRow: (row: QueueTicketRow, index: number) => ReactNode
  className?: string
  /** Drop Upcoming scheduled rows onto Waiting. */
  onAcceptScheduledDrop?: (ticketId: string) => void
  /** Nurse triage vs dentist/physician station tables. */
  variant?: QueueStatusTablesVariant
}) {
  const catalog = catalogFor(variant)
  const defaultVisible = DEFAULT_VISIBLE[variant]
  const [editing, setEditing] = useState(false)
  const [visible, setVisible] = useState<QueueStatusTableId[]>(defaultVisible)
  const [pageSizes, setPageSizes] = useState<
    Partial<Record<QueueStatusTableId, QueuePageSize>>
  >({})
  const [pages, setPages] = useState<Partial<Record<QueueStatusTableId, number>>>(
    {}
  )

  useEffect(() => {
    setVisible(readStoredVisible(variant))
    setPageSizes(readStoredPageSizes(variant))
  }, [variant])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sectionById = useMemo(() => {
    const map = new Map<QueueStatusTableId, QueueStatusTableSection>()
    for (const section of sections) map.set(section.id, section)
    return map
  }, [sections])

  const visibleSections = useMemo(
    () =>
      visible
        .map((id) => sectionById.get(id))
        .filter((section): section is QueueStatusTableSection =>
          Boolean(section)
        ),
    [visible, sectionById]
  )

  function setVisibleAndStore(next: QueueStatusTableId[]) {
    const safe = next.length > 0 ? next : defaultVisible.slice(0, 1)
    setVisible(safe)
    writeStoredVisible(variant, safe)
  }

  function onDragEnd(event: DragEndEvent) {
    if (!editing) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    setVisibleAndStore(
      (() => {
        const oldIndex = visible.indexOf(active.id as QueueStatusTableId)
        const newIndex = visible.indexOf(over.id as QueueStatusTableId)
        if (oldIndex < 0 || newIndex < 0) return visible
        return arrayMove(visible, oldIndex, newIndex)
      })()
    )
  }

  function toggleTable(id: QueueStatusTableId) {
    if (visible.includes(id)) {
      if (visible.length <= 1) return
      setVisibleAndStore(visible.filter((item) => item !== id))
      return
    }
    setVisibleAndStore([...visible, id])
  }

  function setPageSizeFor(id: QueueStatusTableId, size: QueuePageSize) {
    setPageSizes((prev) => {
      const next = { ...prev, [id]: size }
      writeStoredPageSizes(variant, next)
      return next
    })
    setPages((prev) => ({ ...prev, [id]: 0 }))
  }

  return (
    <div className={cn(className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-6">
        {editing ? (
          <p className="text-xs text-muted-foreground">
            Drag to reorder · toggle tables in Add table
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">
            {variant === "specialty"
              ? "Station status tables"
              : "Status tables"}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                  />
                }
              >
                <IconPlus className="size-3.5" stroke={1.75} aria-hidden />
                Add table
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                {catalog.map((item) => {
                  const count = sectionById.get(item.id)?.rows.length ?? 0
                  const active = visible.includes(item.id)
                  const Icon = item.icon
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      className="justify-between gap-3"
                      disabled={active && visible.length <= 1}
                      onClick={() => toggleTable(item.id)}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Icon
                          className="size-3.5 shrink-0 text-muted-foreground"
                          stroke={1.75}
                          aria-hidden
                        />
                        <span className="truncate">{item.title}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 tabular-nums text-muted-foreground">
                        {count}
                        {active ? (
                          <IconCheck
                            className="size-3.5 text-primary"
                            stroke={1.75}
                            aria-hidden
                          />
                        ) : (
                          <span className="size-3.5" aria-hidden />
                        )}
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={editing ? "default" : "outline"}
            className="h-8 gap-1.5"
            onClick={() => setEditing((value) => !value)}
          >
            <IconEdit className="size-3.5" stroke={1.75} aria-hidden />
            {editing ? "Done" : "Edit"}
          </Button>
        </div>
      </div>

      {visibleSections.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          No status tables. Tap Edit, then Add table.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={visibleSections.map((section) => section.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleSections.map((section) => {
              const pageSize = pageSizes[section.id] ?? 5
              return (
                <SortableStatusSection
                  key={section.id}
                  section={section}
                  pageSize={pageSize}
                  page={pages[section.id] ?? 0}
                  editing={editing}
                  onPageChange={(nextPage) =>
                    setPages((prev) => ({ ...prev, [section.id]: nextPage }))
                  }
                  onPageSizeChange={(size) =>
                    setPageSizeFor(section.id, size)
                  }
                  renderRow={renderRow}
                  onAcceptScheduledDrop={onAcceptScheduledDrop}
                />
              )
            })}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
