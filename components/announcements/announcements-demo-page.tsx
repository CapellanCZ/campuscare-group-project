"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  DemoPageHeader,
  DemoStatGrid,
  demoToast,
} from "@/components/demo/demo-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import {
  demoAnnouncements,
  demoAnnouncementStats,
} from "@/lib/demo/fixtures"
import type { AnnouncementStatus } from "@/lib/demo/types"

export function AnnouncementsDemoPage({ access }: { access: StaffAccess }) {
  const [query, setQuery] = useState("")
  const d = access.designation
  const canManage = can(d, "announcements.add")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return demoAnnouncements
    return demoAnnouncements.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.audience.toLowerCase().includes(q)
    )
  }, [query])

  function statusVariant(
    status: AnnouncementStatus
  ): "default" | "secondary" | "outline" {
    if (status === "published") return "default"
    if (status === "scheduled") return "secondary"
    return "outline"
  }

  return (
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="Announcements"
        description="Clinic notices for students and staff"
        designation={d}
        actions={
          canManage ? (
            <Button onClick={() => toast.success(demoToast("Add announcement"))}>
              Add announcement
            </Button>
          ) : null
        }
      />

      {can(d, "announcements.cards") ? (
        <DemoStatGrid stats={demoAnnouncementStats} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Announcement table</CardTitle>
          <Input
            className="sm:w-72"
            placeholder="Search title or audience"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {row.author}
                    </p>
                  </TableCell>
                  <TableCell>{row.audience}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.publishedAt ?? row.updatedAt}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {can(d, "announcements.edit") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.message(demoToast("Edit announcement"))
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                      {can(d, "announcements.publish") &&
                      row.status !== "published" ? (
                        <Button
                          size="xs"
                          onClick={() =>
                            toast.success(demoToast("Publish announcement"))
                          }
                        >
                          Publish
                        </Button>
                      ) : null}
                      {can(d, "announcements.delete") ? (
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() =>
                            toast.error(demoToast("Delete announcement"))
                          }
                        >
                          Delete
                        </Button>
                      ) : null}
                      {!canManage ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast("View announcement"))
                          }
                        >
                          View
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
