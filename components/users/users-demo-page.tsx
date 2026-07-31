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
import { demoStaffUsers, demoUserStats } from "@/lib/demo/fixtures"
import type { StaffAccountStatus } from "@/lib/demo/types"
import { designationLabel } from "@/lib/health/roles"

export function UsersDemoPage({ access }: { access: StaffAccess }) {
  const [query, setQuery] = useState("")
  const d = access.designation

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return demoStaffUsers
    return demoStaffUsers.filter(
      (row) =>
        row.fullName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.designation.includes(q)
    )
  }, [query])

  function statusVariant(
    status: StaffAccountStatus
  ): "default" | "secondary" | "destructive" | "outline" {
    if (status === "active") return "default"
    if (status === "pending") return "secondary"
    if (status === "inactive") return "outline"
    return "destructive"
  }

  return (
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="User Management"
        description="Clinic staff accounts and access"
        designation={d}
        actions={
          can(d, "users.add") ? (
            <Button onClick={() => toast.success(demoToast("Add user"))}>
              Add user
            </Button>
          ) : null
        }
      />

      {can(d, "users.summary_cards") ? (
        <DemoStatGrid stats={demoUserStats} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Staff users</CardTitle>
          <Input
            className="sm:w-72"
            placeholder="Search name, email, or role"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell>
                    {designationLabel(row.designation)}
                  </TableCell>
                  <TableCell>{row.office}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {can(d, "users.edit") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => toast.message(demoToast("Edit user"))}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {can(d, "users.reset_password") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.message(demoToast("Reset password"))
                          }
                        >
                          Reset PW
                        </Button>
                      ) : null}
                      {can(d, "users.activate") ? (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() =>
                            toast.success(
                              demoToast(
                                row.status === "active"
                                  ? "Deactivate user"
                                  : "Activate user"
                              )
                            )
                          }
                        >
                          {row.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      ) : null}
                      {can(d, "users.delete") ? (
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => toast.error(demoToast("Delete user"))}
                        >
                          Delete
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
