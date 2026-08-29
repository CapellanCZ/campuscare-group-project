"use client"

import { appToast } from "@/lib/feedback/app-toast"

import { DemoPageHeader } from "@/components/demo/demo-page"
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

type SettingsSection = {
  id: string
  title: string
  description: string
  permission:
    | "settings.profile"
    | "settings.clinic"
    | "settings.queue"
    | "settings.notification"
    | "settings.security"
    | "settings.system"
  values: { label: string; value: string }[]
}

function buildSections(access: StaffAccess): SettingsSection[] {
  return [
    {
      id: "profile",
      title: "Profile settings",
      description: "Your display name, contact email, and designation.",
      permission: "settings.profile",
      values: [
        { label: "Display name", value: access.fullName },
        { label: "Email", value: access.email || "—" },
        { label: "Designation", value: access.designation },
      ],
    },
    {
      id: "clinic",
      title: "Clinic settings",
      description: "Operating hours and campus location are managed by admins.",
      permission: "settings.clinic",
      values: [
        { label: "Status", value: "Configured in clinic administration" },
      ],
    },
    {
      id: "queue",
      title: "Queue settings",
      description: "Walk-in rules and display preferences.",
      permission: "settings.queue",
      values: [
        { label: "Status", value: "Configured in queue management" },
      ],
    },
    {
      id: "notification",
      title: "Notification settings",
      description: "Staff alerts for requests, queue, and certificates.",
      permission: "settings.notification",
      values: [{ label: "Inbox", value: "Header notifications (live signals)" }],
    },
    {
      id: "security",
      title: "Security settings",
      description: "Session and sign-in policies for staff login.",
      permission: "settings.security",
      values: [{ label: "Status", value: "Managed by your clinic administrator" }],
    },
    {
      id: "system",
      title: "System settings",
      description: "Environment and maintenance controls.",
      permission: "settings.system",
      values: [{ label: "Status", value: "Managed by your clinic administrator" }],
    },
  ]
}

export function SettingsDemoPage({ access }: { access: StaffAccess }) {
  const d = access.designation

  const sections = buildSections(access)
    .map((section) => {
      const level = getAccessLevel(d, section.permission)
      if (level === "none") return null
      return { ...section, level }
    })
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <DemoPageHeader
        title="Settings"
        description="Clinic configuration and your profile"
        designation={d}
        showDemoBanner={false}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          if (!section) return null
          const editable =
            section.level === "full" && section.id === "profile"

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
                      appToast.info({
                        title:
                          "Profile editing will be available when account settings are connected.",
                      })
                    }
                  >
                    Edit profile
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
