# CAMPUSCARE REMEDIATION REPORT

## 1. Executive Summary

Phases 1–6 of the remediation plan are implemented in code for the scoped items below. Security hardening now covers medical documents, consultations, patients, certificates, and queue mutations (session designation must match). Reports Excel export is wired. Public landing has JSON-LD; private staff layouts emit `noindex`. Admin/HSO report aggregates already filter by selected period at query time.

**Typecheck:** run `npx tsc --noEmit` after this pass (see §11).

**Database migration (ops still required):**  
`supabase/migrations/20260923100000_public_queue_display_minimize_phi.sql`  
Supabase MCP had no linked projects in this environment — apply via CLI or dashboard SQL editor.

---

## 2. Phase 1 — Security and Privacy

### Issues fixed

1. **Medical document ownership / consultation scope** (prior pass)
   - Issue / update / void enforce issuer ownership; update requires DB-loaded `ongoing` consultation.

2. **Public queue PHI minimization** (prior pass + migration file)
   - View strips names/assigned personnel; `queue_display` blocked from full ticket SELECT.

3. **Server-action authorization (this pass)**
   - Consultations actions: clinic membership + permission gates on read/create/update/delete.
   - Patients actions: permission gates on search, edit, medical update, import, history, documents.
   - Queue mutations: `requireSessionRole` ensures `params.designation` matches `getStaffAccess()` (not client-spoofable).

### Files/components changed

- `services/medicalDocuments.ts`, `features/medical-documents/actions.ts` (prior)
- `supabase/migrations/20260923100000_public_queue_display_minimize_phi.sql`
- `lib/health/queue-queries.ts`, `lib/health/realtime.ts`, `components/display/queue-display.tsx` (prior)
- `features/consultations/actions.ts`
- `features/patients/actions.ts`
- `lib/health/queue-actions.ts`
- `features/certificates/actions.ts` (already gated; verified)

### Verification performed

- Code-path review of auth gates.
- Typecheck after changes.
- **Pending ops:** apply PHI migration on live Supabase.

---

## 3. Phase 2 — Performance

### router.refresh improvements

- Staff realtime debounce `300ms → 800ms`.
- Removed redundant `router.refresh()` after navigate-away on Start consultation.
- Mutation sites still refresh where local boards need RSC props; server actions already `revalidatePath`.

### Query improvements

- Reports live loader defaults to **Today** when no range.
- Admin/HSO aggregates (`loadAdminReportsAggregates`) already apply `.gte`/`.lte` on consultation_date / ticket created_at / cert dates for the selected period.

### Realtime / duplicate requests

- Display realtime limited to duty/break + 15s poll.
- Broader duplicate-request audit across all modules not claimed complete.

---

## 4. Phase 3 — Accessibility and Code Quality

- Select collision avoidance opens downward in dialogs; labels humanized.
- Select TypeScript generic typing fixed.
- Full lint / stepper / role=button audit not claimed complete.

---

## 5. Phase 4 — UX and Responsiveness

- Intake, walk-in ID, transfers, staff Excel export, office-hours related fixes from concurrent bug list retained.
- Full multi-breakpoint role matrix testing not claimed complete.

---

## 6. Phase 5 — Feature Completeness

- Admin staff Excel export: implemented.
- **Reports Excel:** `Export Excel` button on `ReportsDashboardView`; wired in HSO summary and clinical reports pages via `downloadClinicProgressExcel`.
- `reports.export_excel` permission aligned with PDF (admin + clinical VIEW).
- Nurse medical-document Excel import/export: **not** implemented (requirements still ambiguous).

---

## 7. Phase 6 — SEO and Route Cleanup

- Landing JSON-LD (`WebSite` / `Organization` / `WebApplication`) on `/landing`.
- Canonical / Open Graph already via `buildLandingMetadata`.
- Private layouts (`admin`, `nurse`, `physician`, `dentist`, dashboard group) export `privateSurfaceMetadata` (`robots: noindex`).
- `robots.ts` already disallows private path prefixes.
- Legacy route cleanup: not performed (safe no-delete stance).

---

## 8. Reports Refinement

- Default period **Today**; patient-type colors retained.
- Period-scoped SQL for admin aggregates confirmed.

---

## 9. Before vs After Measurements

| Area | Before | After |
|------|--------|-------|
| Consultations/patients actions | No permission gate | `can()` + clinic membership |
| Queue designation | Trusted caller param | Must match session designation |
| Reports Excel | PDF/Print only on dashboard | Excel button + download |
| Private SEO | Auth only | Auth + `noindex` metadata |
| Landing SEO | Meta only | Meta + JSON-LD |
| Public queue view | PHI columns | Ticket/station/status only (migration pending apply) |
| Reports no-range load | Full history risk | Forced Today minimum |
| Staff realtime debounce | 300ms | 800ms |

Lighthouse numeric before/after: **not re-run** (no fabricated scores).

---

## 10. Remaining Issues

1. **Apply** `20260923100000_public_queue_display_minimize_phi.sql` to production/staging Supabase.
2. Further local-state updates to eliminate remaining mutation `router.refresh()` where boards can patch in-place.
3. Full a11y sweep (stepper, custom `role=button`, tables/charts).
4. Full responsive matrix + Lighthouse.
5. Nurse medical-document Excel import/export (if still required).
6. Confirm intake Notes no longer shows UUID after reschedule-note sanitization (spot-check in UI).

---

## 11. Testing Completed

- Static review of auth, Excel wiring, SEO metadata paths.
- TypeScript check after this pass.

**Not completed:** full browser E2E matrix, Lighthouse, authenticated responsive tour.

---

## 12. Known Limitations

- Public queue freshness depends on **15s polling** plus duty realtime.
- Migration must be applied manually; until then, reduced-column app selects may fail against the old view.

---

## Immediate operator action

```bash
# Apply the new migration to your Supabase project (CLI or dashboard SQL editor)
# File: supabase/migrations/20260923100000_public_queue_display_minimize_phi.sql
```

Then smoke-test:

1. Physician issues + edits document only while consultation ongoing; another clinician cannot void it.
2. Queue display shows ticket numbers only (no names).
3. Unauthenticated / wrong-role server actions return permission errors.
4. Reports: Export Excel downloads a workbook for the selected period.
5. View-source on `/landing` includes JSON-LD; staff pages send `noindex`.
