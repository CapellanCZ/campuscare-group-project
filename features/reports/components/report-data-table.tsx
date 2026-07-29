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

export function ReportDataTable({
  table,
  query,
  onQueryChange,
}: {
  table: ReportTableBundle
  query: string
  onQueryChange: (query: string) => void
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [details, setDetails] = useState<ReportTableRow | null>(null)

  const sorted = useMemo(() => {
    const rows = [...table.rows]
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
  }, [table.rows, sortKey, sortDir])

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{table.title}</h3>
          <Badge variant="secondary" className="tabular-nums">
            {table.rows.length}
          </Badge>
        </div>
        <Input
          className="sm:max-w-72"
          placeholder="Search report rows"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.columns.length + 1}
                  className="py-10 text-center text-muted-foreground"
                >
                  No rows match the current filters.
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
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => setDetails(row)}
                    >
                      View details
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  )
}
