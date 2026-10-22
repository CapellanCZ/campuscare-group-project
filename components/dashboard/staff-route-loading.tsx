import { StaffContentSkeleton } from "@/components/dashboard/staff-content-skeleton"

/**
 * App Router `loading.tsx` fallback — show immediately on nav click so the
 * previous page does not look frozen while the auth-only RSC resolves.
 */
export function StaffRouteLoading() {
  return <StaffContentSkeleton />
}
