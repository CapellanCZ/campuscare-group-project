-- Allow admin staff account deletion without FK violations.

ALTER TABLE public.patient_records
  DROP CONSTRAINT IF EXISTS patient_records_last_edited_by_fkey;

ALTER TABLE public.patient_records
  ADD CONSTRAINT patient_records_last_edited_by_fkey
  FOREIGN KEY (last_edited_by) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_author_id_fkey;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users (id) ON DELETE CASCADE;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES public.users (id) ON DELETE SET NULL;

ALTER TABLE public.appointment_consultations
  ALTER COLUMN doctor_id DROP NOT NULL;

ALTER TABLE public.appointment_consultations
  DROP CONSTRAINT IF EXISTS consultations_doctor_id_fkey;

ALTER TABLE public.appointment_consultations
  ADD CONSTRAINT consultations_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES public.users (id) ON DELETE SET NULL;
