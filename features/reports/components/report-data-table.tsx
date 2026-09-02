"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReportTableBundle, ReportTableRow } from "@/features/reports/types"

const PAGE_SIZE = 8

function rowMatchesQuery(row: ReportTableRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const cellText = Object.values(row.cells)
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase()
  const detailText = row.details
    ? Object.values(row.details)
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
    : ""
  return cellText.includes(q) || detailText.includes(q)
}

export function ReportDataTable({
  table,
  query,
  onQueryChange,
  hideTitle = false,
  /** Isolate search to this table (does not update shared report filters). */
  independentSearch = false,
  compact = false,
}: {
  table: ReportTableBundle
  query: string
  onQueryChange: (query: string) => void
  /** When parent already shows the report title. */
  hideTitle?: boolean
  independentSearch?: boolean
  /** Supporting table under a chart — no search, details, or extra chrome. */
  compact?: boolean
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [details, setDetails] = useState<ReportTableRow | null>(null)
  const [localQuery, setLocalQuery] = useState("")

  const activeQuery = independentSearch ? localQuery : query

  const sorted = useMemo(() => {
    const rows = independentSearch
      ? table.rows.filter((row) => rowMatchesQuery(row, activeQuery))
      : [...table.rows]
    if (!sortKey) return rows
    rows.sort((a, b) => {
      const av = a.cells[sortKey]
      const bv = b.cells[sortKey]
      const an = typeof av === "number" ? av : Number(av)
      const bn = typeof bv === "number" ? bv : Number(bv)
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return sortDir === "asc" ? an - bn : bn - an
      }
      const as = String(av ?? "")
      const bs = String(bv ?? "")
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return rows
  }, [table.rows, sortKey, sortDir, independentSearch, activeQuery])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <div className="space-y-3">
      {compact ? null : (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {hideTitle ? null : (
            <h3 className="text-sm font-medium">{table.title}</h3>
          )}
          <Badge variant="secondary" className="tabular-nums">
            {sorted.length}
          </Badge>
        </div>
        <Input
          className="sm:max-w-72"
          placeholder="Search report rows"
          value={activeQuery}
          onChange={(e) => {
            const next = e.target.value
            if (independentSearch) {
              setLocalQuery(next)
            } else {
              onQueryChange(next)
            }
            setPage(1)
          }}
        />
      </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card dark:border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {table.columns.map((col) => (
                <TableHead key={col.key}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              {compact ? null : (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.columns.length + (compact ? 0 : 1)}
                  className="py-10 text-center text-muted-foreground"
                >
                  No data available for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  {table.columns.map((col) => (
                    <TableCell key={col.key} className="max-w-40 truncate">
                      {String(row.cells[col.key] ?? "")}
                    </TableCell>
                  ))}
                  {compact ? null : (
                    <TableCell className="text-right">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() => setDetails(row)}
                      >
                        View details
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sorted.length > PAGE_SIZE ? (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
      ) : null}

      {compact ? null : (
      <Dialog open={Boolean(details)} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report row details</DialogTitle>
            <DialogDescription>{table.title}</DialogDescription>
          </DialogHeader>
          <dl className="grid gap-2 text-sm">
            {details?.details
              ? Object.entries(details.details).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/50 py-1"
                  >
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))
              : null}
          </dl>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}
