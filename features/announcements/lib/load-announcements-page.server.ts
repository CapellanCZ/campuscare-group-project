import "server-only"

import { canMutate } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { getAnnouncementsPageBundle } from "@/services/announcements"
import type { AnnouncementsPageBundle } from "@/features/announcements/lib/announcements-page-types"

/** RSC + server-action shared loader (feed + list + stats). */
export async function loadAnnouncementsPageData(
  access: StaffAccess
): Promise<AnnouncementsPageBundle> {
  return getAnnouncementsPageBundle({
    canManage: canMutate(access.designation, "announcements.add"),
    feedPageSize: 6,
    listPageSize: 10,
  })
}
