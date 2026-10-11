import { requireStaffModule } from "@/lib/auth/require-module"

export async function StaffSettingsPage() {
  const access = await requireStaffModule("settings")
  const { getStaffProfile, getUserPreferences } = await import(
    "@/services/staff-profile"
  )
  const { ProfileSettingsPage } = await import(
    "@/components/settings/profile-settings-page"
  )
  const [profile, preferences] = await Promise.all([
    getStaffProfile(access.userId),
    getUserPreferences(access.userId),
  ])

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
        Unable to load your profile.
      </div>
    )
  }

  const profilePage = (
    <ProfileSettingsPage
      profile={profile}
      preferences={preferences}
      elevated={access.primaryRole === "admin"}
    />
  )

  if (access.primaryRole === "admin") {
    const { loadOfficeHoursBundle } = await import(
      "@/features/availability/actions/availability"
    )
    const { OfficeHoursSettings } = await import(
      "@/features/admin/components/office-hours-settings"
    )
    const { adminPageShellClassName } = await import(
      "@/features/admin/lib/admin-surface"
    )
    const bundle = await loadOfficeHoursBundle()
    return (
      <div className={adminPageShellClassName("gap-8")}>
        {profilePage}
        <OfficeHoursSettings
          access={access}
          clinicHours={bundle.clinicHours}
          staff={bundle.staff}
        />
      </div>
    )
  }

  if (access.primaryRole === "physician") {
    const { getClinicHours, getStaffWeeklyHours } = await import(
      "@/lib/availability/queries"
    )
    const { StaffSchedulePage } = await import(
      "@/features/availability/components/staff-schedule-page"
    )
    const [availability, clinicHours] = await Promise.all([
      getStaffWeeklyHours(access.userId),
      getClinicHours(),
    ])
    return (
      <div className="flex flex-1 flex-col gap-8">
        {profilePage}
        <StaffSchedulePage
          doctorName={access.fullName}
          availability={availability}
          clinicHours={clinicHours}
          embeddedInSettings
        />
      </div>
    )
  }

  if (access.primaryRole === "dentist") {
    const { getClinicHours, getStaffWeeklyHours } = await import(
      "@/lib/availability/queries"
    )
    const { StaffSchedulePage } = await import(
      "@/features/availability/components/staff-schedule-page"
    )
    const [availability, clinicHours] = await Promise.all([
      getStaffWeeklyHours(access.userId),
      getClinicHours(),
    ])
    return (
      <div className="flex flex-1 flex-col gap-8">
        {profilePage}
        <StaffSchedulePage
          doctorName={access.fullName}
          availability={availability}
          clinicHours={clinicHours}
          embeddedInSettings
        />
      </div>
    )
  }

  if (access.primaryRole === "nurse") {
    const { getClinicCapacities } = await import(
      "@/services/consultation-capacity"
    )
    const { getClinicHours, getStaffWeeklyHours } = await import(
      "@/lib/availability/queries"
    )
    const { ConsultationCapacitySettings } = await import(
      "@/features/admin/components/consultation-capacity-settings"
    )
    const { StaffSchedulePage } = await import(
      "@/features/availability/components/staff-schedule-page"
    )
    const [capacities, availability, clinicHours] = await Promise.all([
      getClinicCapacities(),
      getStaffWeeklyHours(access.userId),
      getClinicHours(),
    ])
    return (
      <div className="flex flex-1 flex-col gap-8">
        <ProfileSettingsPage
          profile={profile}
          preferences={preferences}
          rightColumnExtras={
            <ConsultationCapacitySettings
              initial={capacities}
              elevated={false}
            />
          }
        />
        <StaffSchedulePage
          doctorName={access.fullName}
          availability={availability}
          clinicHours={clinicHours}
          embeddedInSettings
        />
      </div>
    )
  }

  return profilePage
}
