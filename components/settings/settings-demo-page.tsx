"use client"

import { toast } from "sonner"

import {
  DemoPageHeader,
  demoToast,
} from "@/components/demo/demo-page"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { demoSettingsSections } from "@/lib/demo/fixtures"

export function SettingsDemoPage({ access }: { access: StaffAccess }) {
  const d = access.designation

  const sections = demoSettingsSections
    .map((section) => {
      const permission =
        section.permission === "profile"
          ? ("settings.profile" as const)
          : section.permission === "clinic"
            ? ("settings.clinic" as const)
            : section.permission === "queue"
              ? ("settings.queue" as const)
              : section.permission === "notification"
                ? ("settings.notification" as const)
                : section.permission === "security"
                  ? ("settings.security" as const)
                  : ("settings.system" as const)

      const level = getAccessLevel(d, permission)
      if (level === "none") return null

      const values =
        section.id === "profile"
          ? [
              { label: "Display name", value: access.fullName },
              { label: "Email", value: access.email || "—" },
              {
                label: "Preferred station",
                value: "Auto from designation",
              },
            ]
          : section.values

      return { ...section, level, values, permission }
    })
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Settings"
        description="Clinic configuration and your profile"
        designation={d}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          if (!section) return null
          const editable = section.level === "full"

          return (
            <Card
              key={section.id}
              className="min-w-0 shadow-none dark:ring-0"
            >
              <CardHeader>
                <CardTitle className="text-base">
                  {section.title}
                  {section.level === "view" ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (view)
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-3">
                  {section.values.map((item) => (
                    <div
                      key={item.label}
                      className="flex min-w-0 items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="text-sm text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="truncate text-right text-sm font-medium">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {editable ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.message(demoToast(`Edit ${section.title}`))
                    }
                  >
                    Edit section
                  </Button>
                ) : can(d, "settings.profile") && section.id === "profile" ? (
                  <p className="text-xs text-muted-foreground">
                    Profile fields are view-only for your role.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
