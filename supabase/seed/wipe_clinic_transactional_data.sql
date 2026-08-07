-- =============================================================================
-- ONE-TIME MANUAL CLEANUP — run in the Supabase SQL Editor
-- =============================================================================
-- Purpose:
--   Wipe sample / leftover clinic transactional data so Requests, Queue,
--   Consultations, Certificates, and Patients only show real mobile↔web traffic.
--
-- KEEP (do not truncate / delete):
--   auth.users, public.users, clinic_members, clinics
--   clinic_consultation_capacity
--   clinic_office_hours, clinic_break_status, staff_break_status
--   doctor_availability (staff schedules)
--   announcements / announcement_attachments
--   admin_accounts, user_preferences, storage buckets, RLS / schema
--
-- DELETE:
--   appointments, health_queue_tickets, consultation_requests (+ children)
--   appointment_consultations, consultations, medical_certificates
--   patient_records, patients, patient_device_tokens, notifications
--   health_appointments (legacy admin queue table), if present
--
-- After run:
--   1. Confirm verification SELECTs are all 0
--   2. Refresh nurse/web UIs — lists should be empty
--   3. Smoke: mobile creates appointment → appears on web Requests
--
-- Safe to re-run (idempotent empties). NOT a migration — do not add to auto-deploy.
-- =============================================================================

BEGIN;

-- Break circular FKs between appointments <-> tickets (and related links)
DO $$
BEGIN
  IF to_regclass('public.appointments') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'appointments'
         AND column_name = 'queue_ticket_id'
     ) THEN
    UPDATE public.appointments SET queue_ticket_id = NULL WHERE queue_ticket_id IS NOT NULL;
  END IF;

  IF to_regclass('public.health_queue_tickets') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'health_queue_tickets'
        AND column_name = 'appointment_id'
    ) THEN
      UPDATE public.health_queue_tickets
      SET appointment_id = NULL
      WHERE appointment_id IS NOT NULL;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'health_queue_tickets'
        AND column_name = 'consultation_request_id'
    ) THEN
      UPDATE public.health_queue_tickets
      SET consultation_request_id = NULL
      WHERE consultation_request_id IS NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.consultations') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'consultations'
        AND column_name = 'queue_ticket_id'
    ) THEN
      UPDATE public.consultations
      SET queue_ticket_id = NULL
      WHERE queue_ticket_id IS NOT NULL;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'consultations'
        AND column_name = 'consultation_request_id'
    ) THEN
      UPDATE public.consultations
      SET consultation_request_id = NULL
      WHERE consultation_request_id IS NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.consultation_requests') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'consultation_requests'
         AND column_name = 'queue_ticket_id'
     ) THEN
    UPDATE public.consultation_requests
    SET queue_ticket_id = NULL
    WHERE queue_ticket_id IS NOT NULL;
  END IF;
END $$;

-- Truncate transactional tables that exist (children first where CASCADE is enough)
DO $$
DECLARE
  tbl text;
  targets text[] := ARRAY[
    'consultation_request_notes',
    'consultation_request_timeline',
    'consultation_request_attachments',
    'consultation_request_audit',
    'medical_certificates',
    'appointment_consultations',
    'consultations',
    'health_queue_tickets',
    'consultation_requests',
    'appointments',
    'health_appointments',
    'notifications',
    'patient_device_tokens',
    'patient_records',
    'patients'
  ];
BEGIN
  FOREACH tbl IN ARRAY targets LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', tbl);
      RAISE NOTICE 'Truncated public.%', tbl;
    ELSE
      RAISE NOTICE 'Skip missing table public.%', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- -----------------------------------------------------------------------------
-- Verification — expect all counts = 0 for wiped tables
-- (dynamic SQL so missing tables like health_appointments do not fail parse)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  n bigint;
  targets text[] := ARRAY[
    'appointments',
    'health_queue_tickets',
    'consultation_requests',
    'consultations',
    'appointment_consultations',
    'medical_certificates',
    'patients',
    'patient_records',
    'notifications',
    'patient_device_tokens',
    'health_appointments'
  ];
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _wipe_verify (
    table_name text PRIMARY KEY,
    row_count bigint
  ) ON COMMIT PRESERVE ROWS;

  DELETE FROM _wipe_verify;

  FOREACH tbl IN ARRAY targets LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      INSERT INTO _wipe_verify (table_name, row_count) VALUES (tbl, NULL);
    ELSE
      EXECUTE format('SELECT count(*)::bigint FROM public.%I', tbl) INTO n;
      INSERT INTO _wipe_verify (table_name, row_count) VALUES (tbl, n);
    END IF;
  END LOOP;

  -- Kept config / staff (should be > 0)
  INSERT INTO _wipe_verify (table_name, row_count)
  VALUES ('users (staff profiles kept)', (SELECT count(*)::bigint FROM public.users))
  ON CONFLICT (table_name) DO UPDATE SET row_count = EXCLUDED.row_count;

  IF to_regclass('public.clinic_consultation_capacity') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::bigint FROM public.clinic_consultation_capacity' INTO n;
    INSERT INTO _wipe_verify (table_name, row_count)
    VALUES ('clinic_consultation_capacity (kept)', n)
    ON CONFLICT (table_name) DO UPDATE SET row_count = EXCLUDED.row_count;
  END IF;

  IF to_regclass('public.clinic_office_hours') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::bigint FROM public.clinic_office_hours' INTO n;
    INSERT INTO _wipe_verify (table_name, row_count)
    VALUES ('clinic_office_hours (kept)', n)
    ON CONFLICT (table_name) DO UPDATE SET row_count = EXCLUDED.row_count;
  END IF;
END $$;

SELECT table_name, row_count
FROM _wipe_verify
ORDER BY table_name;

