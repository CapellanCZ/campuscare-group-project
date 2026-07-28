-- Single-campus RLS for every staff role (admin / nurse / physician / dentist).
-- Replaces legacy doctor/clinic_staff-only checks that blocked real users.

-- Keep memberships aligned with profiles.
INSERT INTO public.clinic_members (clinic_id, profile_id, member_role, is_active)
SELECT
  c.id,
  p.id,
  CASE
    WHEN p.primary_role IN (
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role
    ) THEN p.primary_role
    ELSE 'clinic_staff'::public.web_role
  END,
  COALESCE(p.is_active, true)
FROM public.profiles p
CROSS JOIN LATERAL (
  SELECT id FROM public.clinics WHERE is_active = true ORDER BY created_at ASC LIMIT 1
) c
WHERE p.primary_role IN (
  'admin'::public.web_role,
  'nurse'::public.web_role,
  'physician'::public.web_role,
  'dentist'::public.web_role,
  'clinic_staff'::public.web_role
)
ON CONFLICT (clinic_id, profile_id) DO UPDATE
SET
  member_role = EXCLUDED.member_role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ---------- patients ----------
DROP POLICY IF EXISTS "patients_select_clinic" ON public.patients;
CREATE POLICY "patients_select_clinic"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "patients_insert_clinic" ON public.patients;
CREATE POLICY "patients_insert_clinic"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "patients_update_clinic" ON public.patients;
CREATE POLICY "patients_update_clinic"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

-- ---------- appointments ----------
DROP POLICY IF EXISTS "appointments_select_clinic" ON public.appointments;
CREATE POLICY "appointments_select_clinic"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "appointments_insert_staff" ON public.appointments;
CREATE POLICY "appointments_insert_staff"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND public.has_clinic_role(
      clinic_id,
      ARRAY[
        'admin'::public.web_role,
        'nurse'::public.web_role,
        'physician'::public.web_role,
        'dentist'::public.web_role
      ]
    )
  );

DROP POLICY IF EXISTS "appointments_update_staff" ON public.appointments;
CREATE POLICY "appointments_update_staff"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'nurse'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'nurse'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  );

-- ---------- consultations ----------
DROP POLICY IF EXISTS "consultations_select_clinic" ON public.consultations;
CREATE POLICY "consultations_select_clinic"
  ON public.consultations
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "consultations_insert_doctor" ON public.consultations;
CREATE POLICY "consultations_insert_doctor"
  ON public.consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  );

DROP POLICY IF EXISTS "consultations_update_doctor" ON public.consultations;
CREATE POLICY "consultations_update_doctor"
  ON public.consultations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  );

-- ---------- doctor_availability ----------
DROP POLICY IF EXISTS "availability_select_clinic" ON public.doctor_availability;
CREATE POLICY "availability_select_clinic"
  ON public.doctor_availability
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "availability_write_own" ON public.doctor_availability;
CREATE POLICY "availability_write_own"
  ON public.doctor_availability
  FOR ALL
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY['admin'::public.web_role]
      )
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY['admin'::public.web_role]
      )
    )
  );

-- ---------- announcements ----------
DROP POLICY IF EXISTS "authenticated read announcements" ON public.announcements;
CREATE POLICY "authenticated read announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "admin insert announcements" ON public.announcements;
CREATE POLICY "admin insert announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin update announcements" ON public.announcements;
CREATE POLICY "admin update announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin delete announcements" ON public.announcements;
CREATE POLICY "admin delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

-- ---------- health_queue_tickets ----------
DROP POLICY IF EXISTS "staff read queue tickets" ON public.health_queue_tickets;
CREATE POLICY "staff read queue tickets"
  ON public.health_queue_tickets
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write queue tickets" ON public.health_queue_tickets;
CREATE POLICY "staff write queue tickets"
  ON public.health_queue_tickets
  FOR ALL
  TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

-- ---------- medical_certificates (confirm campus membership) ----------
DROP POLICY IF EXISTS "authenticated read medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated read medical certificates"
  ON public.medical_certificates
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

DROP POLICY IF EXISTS "authenticated insert medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated insert medical certificates"
  ON public.medical_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

DROP POLICY IF EXISTS "authenticated update medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated update medical certificates"
  ON public.medical_certificates
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

DROP POLICY IF EXISTS "authenticated delete medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated delete medical certificates"
  ON public.medical_certificates
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

-- ---------- profiles: campus staff can read clinic colleagues ----------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_clinic" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_select_campus_staff"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND primary_role IN (
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role,
      'clinic_staff'::public.web_role
    )
  );

-- ---------- clinic_members / clinics ----------
DROP POLICY IF EXISTS clinic_members_select_own ON public.clinic_members;
CREATE POLICY clinic_members_select_own
  ON public.clinic_members
  FOR SELECT
  TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR public.has_active_clinic_membership()
  );

DROP POLICY IF EXISTS clinics_select_authenticated ON public.clinics;
CREATE POLICY clinics_select_authenticated
  ON public.clinics
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

REVOKE EXECUTE ON FUNCTION public.sync_clinic_member_role_from_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_clinic_member_role_from_profile() TO authenticated;
