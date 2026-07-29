/**
 * Mobile / patient-app data contract (read via Supabase Data API + RLS).
 *
 * Tables (SELECT allowed for anon + authenticated):
 * - clinic_office_hours — weekly clinic open/closed windows (Asia/Manila)
 * - clinic_break_status — clinic-wide on_break + resumes_at
 * - staff_break_status — per-clinician on_break + resumes_at
 * - doctor_availability — weekly staff slots; doctor_id = users.id
 *   (physician / dentist / nurse)
 *
 * Booking must still enforce the same rules as web
 * (`assertCanAccommodate` / clinic ∩ staff hours ∩ not on break).
 */
export {}
