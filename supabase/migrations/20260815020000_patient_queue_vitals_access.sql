-- Patient-readable queue vitals (BP / heart rate) for mobile.
-- Staff policies remain; this adds own-row SELECT + a convenience RPC.

DROP POLICY IF EXISTS "patients_select_own_queue_tickets" ON public.health_queue_tickets;
CREATE POLICY "patients_select_own_queue_tickets"
  ON public.health_queue_tickets
  FOR SELECT
  TO authenticated
  USING (
    (
      patient_id IS NOT NULL
      AND patient_id IN (
        SELECT p.id
        FROM public.patients p
        WHERE p.auth_user_id = (SELECT auth.uid())
      )
    )
    OR (
      appointment_id IS NOT NULL
      AND appointment_id IN (
        SELECT a.id
        FROM public.appointments a
        JOIN public.patients p ON p.id = a.patient_id
        WHERE p.auth_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.get_my_latest_vitals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.health_queue_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.*
  INTO v_row
  FROM public.health_queue_tickets t
  WHERE (
      t.patient_id IN (
        SELECT p.id FROM public.patients p WHERE p.auth_user_id = v_uid
      )
      OR t.appointment_id IN (
        SELECT a.id
        FROM public.appointments a
        JOIN public.patients p ON p.id = a.patient_id
        WHERE p.auth_user_id = v_uid
      )
    )
    AND (
      t.vitals_bp_systolic IS NOT NULL
      OR t.vitals_bp_diastolic IS NOT NULL
      OR t.vitals_heart_rate IS NOT NULL
    )
  ORDER BY coalesce(t.intake_completed_at, t.updated_at, t.created_at) DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'ticketId', v_row.id,
    'appointmentId', coalesce(v_row.appointment_id, v_row.health_appointment_id),
    'serviceDate', v_row.service_date,
    'status', v_row.status,
    'bloodPressureSystolic', v_row.vitals_bp_systolic,
    'bloodPressureDiastolic', v_row.vitals_bp_diastolic,
    'bloodPressure',
      CASE
        WHEN v_row.vitals_bp_systolic IS NOT NULL
          AND v_row.vitals_bp_diastolic IS NOT NULL
          THEN v_row.vitals_bp_systolic::text || '/' || v_row.vitals_bp_diastolic::text
        WHEN v_row.vitals_bp_systolic IS NOT NULL
          THEN v_row.vitals_bp_systolic::text
        ELSE NULL
      END,
    'heartRate', v_row.vitals_heart_rate,
    'temperatureC', v_row.vitals_temperature_c,
    'spo2', v_row.vitals_spo2,
    'heightCm', v_row.vitals_height_cm,
    'weightKg', v_row.vitals_weight_kg,
    'respiratoryRate', v_row.vitals_respiratory_rate,
    'recordedAt', coalesce(v_row.intake_completed_at, v_row.updated_at, v_row.created_at)
  );
END;
$$;

COMMENT ON FUNCTION public.get_my_latest_vitals() IS
  'Returns the latest nurse-recorded vitals (BP, heart rate, …) for the signed-in patient.';

REVOKE ALL ON FUNCTION public.get_my_latest_vitals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_latest_vitals() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_latest_vitals() TO authenticated;
