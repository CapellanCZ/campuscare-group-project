/**
 * Resolve a consultations.patient_id (patient_records.id) to an operational
 * patients.id for tables that FK to public.patients (e.g. follow_up_reminders).
 */
CREATE OR REPLACE FUNCTION public.resolve_operational_patient_id(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient_id uuid;
  v_record public.patient_records%ROWTYPE;
  v_campus_id text;
  v_is_faculty boolean;
  v_full_name text;
  v_clinic_id uuid := '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid;
BEGIN
  IF p_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Already an operational patients row
  SELECT p.id INTO v_patient_id
  FROM public.patients p
  WHERE p.id = p_id
  LIMIT 1;

  IF v_patient_id IS NOT NULL THEN
    RETURN v_patient_id;
  END IF;

  SELECT * INTO v_record
  FROM public.patient_records pr
  WHERE pr.id = p_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_is_faculty := COALESCE(v_record.patient_type, '') IN ('faculty', 'employee');
  v_campus_id := CASE
    WHEN v_is_faculty THEN NULLIF(btrim(COALESCE(v_record.employee_id, '')), '')
    ELSE NULLIF(btrim(COALESCE(v_record.student_id, '')), '')
  END;

  IF v_campus_id IS NOT NULL THEN
    IF v_is_faculty THEN
      SELECT p.id INTO v_patient_id
      FROM public.patients p
      WHERE p.employee_id = v_campus_id
      LIMIT 1;
    ELSE
      SELECT p.id INTO v_patient_id
      FROM public.patients p
      WHERE p.student_id = v_campus_id
      LIMIT 1;
    END IF;

    IF v_patient_id IS NOT NULL THEN
      RETURN v_patient_id;
    END IF;
  END IF;

  v_full_name := NULLIF(
    btrim(concat_ws(
      ' ',
      NULLIF(btrim(COALESCE(v_record.first_name, '')), ''),
      NULLIF(btrim(COALESCE(v_record.middle_name, '')), ''),
      NULLIF(btrim(COALESCE(v_record.last_name, '')), '')
    )),
    ''
  );
  IF v_full_name IS NULL THEN
    v_full_name := 'Patient';
  END IF;

  INSERT INTO public.patients (
    clinic_id,
    full_name,
    email,
    student_id,
    employee_id,
    phone,
    date_of_birth,
    sex,
    patient_type,
    affiliation,
    timezone
  )
  VALUES (
    v_clinic_id,
    v_full_name,
    v_record.email,
    CASE WHEN v_is_faculty THEN NULL ELSE v_campus_id END,
    CASE WHEN v_is_faculty THEN v_campus_id ELSE NULL END,
    v_record.phone,
    v_record.birth_date,
    v_record.gender,
    CASE WHEN v_is_faculty THEN 'faculty' ELSE 'student' END,
    CASE WHEN v_is_faculty THEN 'faculty' ELSE 'student' END,
    'Asia/Manila'
  )
  RETURNING id INTO v_patient_id;

  RETURN v_patient_id;
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent create — re-resolve by campus id
    IF v_campus_id IS NOT NULL THEN
      IF v_is_faculty THEN
        SELECT p.id INTO v_patient_id
        FROM public.patients p
        WHERE p.employee_id = v_campus_id
        LIMIT 1;
      ELSE
        SELECT p.id INTO v_patient_id
        FROM public.patients p
        WHERE p.student_id = v_campus_id
        LIMIT 1;
      END IF;
    END IF;
    RETURN v_patient_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_follow_up_reminder_from_consultation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient_id uuid;
  v_remind_at timestamptz;
  v_today_manila date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.follow_up_reminders
    SET status = 'cancelled', updated_at = now()
    WHERE consultation_id = OLD.id
      AND status = 'scheduled';
    RETURN OLD;
  END IF;

  IF NEW.follow_up_date IS NULL THEN
    UPDATE public.follow_up_reminders
    SET status = 'cancelled', updated_at = now()
    WHERE consultation_id = NEW.id
      AND status = 'scheduled';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.follow_up_date IS NOT DISTINCT FROM NEW.follow_up_date
  THEN
    RETURN NEW;
  END IF;

  -- consultations.patient_id is patient_records.id; reminders FK to patients.id
  v_patient_id := public.resolve_operational_patient_id(NEW.patient_id);
  IF v_patient_id IS NULL THEN
    -- Do not block completing the consultation if patient cannot be resolved.
    RETURN NEW;
  END IF;

  v_today_manila := (timezone('Asia/Manila', now()))::date;

  IF NEW.follow_up_date <= v_today_manila THEN
    UPDATE public.follow_up_reminders
    SET status = 'cancelled', updated_at = now()
    WHERE consultation_id = NEW.id
      AND status = 'scheduled';
    RETURN NEW;
  END IF;

  v_remind_at := public.follow_up_remind_at(NEW.follow_up_date, 1);

  INSERT INTO public.follow_up_reminders (
    consultation_id,
    patient_id,
    appointment_id,
    follow_up_date,
    remind_at,
    days_before,
    status,
    updated_at
  )
  VALUES (
    NEW.id,
    v_patient_id,
    NEW.appointment_id,
    NEW.follow_up_date,
    v_remind_at,
    1,
    'scheduled',
    now()
  )
  ON CONFLICT (consultation_id) DO UPDATE
    SET patient_id = EXCLUDED.patient_id,
        appointment_id = EXCLUDED.appointment_id,
        follow_up_date = EXCLUDED.follow_up_date,
        remind_at = EXCLUDED.remind_at,
        days_before = EXCLUDED.days_before,
        status = 'scheduled',
        updated_at = now();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.resolve_operational_patient_id(uuid) IS
  'Maps patient_records.id or patients.id to an operational patients.id.';

COMMENT ON FUNCTION public.schedule_follow_up_reminder_from_consultation() IS
  'Schedules follow-up reminders using operational patients.id (not patient_records.id).';
