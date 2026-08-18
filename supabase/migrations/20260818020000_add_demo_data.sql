-- Demo data insertion using existing users and records
-- This migration adds temporary/demo consultation data for testing purposes

-- NOTE: This migration uses existing clinic_id and user_ids from the system
-- Adjust these UUIDs based on actual deployment

-- Find or set the campus clinic ID (from lib/auth/campus-clinic.ts)
-- For this demo, using: 34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b

-- Demo consultation requests
INSERT INTO public.consultation_requests (
  id,
  patient_record_id,
  patient_name,
  student_id,
  service,
  provider_type,
  status,
  preferred_date,
  reason,
  symptoms,
  created_at,
  updated_at,
  submitted_at
) SELECT
  gen_random_uuid() as id,
  pr.id as patient_record_id,
  pr.first_name || ' ' || pr.last_name as patient_name,
  pr.student_id,
  CASE WHEN random() > 0.5 THEN 'Medical Consultation' ELSE 'Dental Checkup' END as service,
  CASE WHEN random() > 0.5 THEN 'physician' ELSE 'dentist' END as provider_type,
  'pending'::text as status,
  CURRENT_DATE + INTERVAL '1 day' as preferred_date,
  CASE 
    WHEN random() > 0.7 THEN 'General checkup'
    WHEN random() > 0.4 THEN 'Headache and dizziness'
    WHEN random() > 0.2 THEN 'Tooth pain'
    ELSE 'Routine check'
  END as reason,
  CASE
    WHEN random() > 0.7 THEN 'Occasional discomfort, no fever'
    WHEN random() > 0.4 THEN 'Persistent symptoms, affecting daily activities'
    ELSE 'Mild symptoms'
  END as symptoms,
  now() - (random() * INTERVAL '7 days') as created_at,
  now() as updated_at,
  now() - (random() * INTERVAL '7 days') as submitted_at
FROM public.patient_records pr
WHERE pr.student_id IS NOT NULL
  AND pr.created_at > now() - INTERVAL '30 days'
LIMIT 5;

-- Demo approved consultation requests with corresponding consultations
INSERT INTO public.consultation_requests (
  id,
  patient_record_id,
  patient_name,
  student_id,
  service,
  provider_type,
  status,
  preferred_date,
  reason,
  created_at,
  updated_at,
  submitted_at
) SELECT
  gen_random_uuid() as id,
  pr.id as patient_record_id,
  pr.first_name || ' ' || pr.last_name as patient_name,
  pr.student_id,
  CASE WHEN random() > 0.5 THEN 'Medical Consultation' ELSE 'Dental Checkup' END as service,
  CASE WHEN random() > 0.5 THEN 'physician' ELSE 'dentist' END as provider_type,
  'approved'::text as status,
  CURRENT_DATE as preferred_date,
  CASE 
    WHEN random() > 0.7 THEN 'Annual physical'
    WHEN random() > 0.4 THEN 'Follow-up consultation'
    ELSE 'Preventive care'
  END as reason,
  now() - (random() * INTERVAL '3 days') as created_at,
  now() as updated_at,
  now() - (random() * INTERVAL '3 days') as submitted_at
FROM public.patient_records pr
WHERE pr.student_id IS NOT NULL
  AND pr.created_at > now() - INTERVAL '30 days'
LIMIT 4;

-- Demo consultations (using approved requests)
INSERT INTO public.consultations (
  id,
  patient_id,
  chief_complaint,
  symptoms,
  status,
  priority,
  provider_type,
  consultation_date,
  consultation_request_id,
  created_at,
  updated_at
) SELECT
  gen_random_uuid() as id,
  cr.patient_record_id as patient_id,
  cr.reason as chief_complaint,
  cr.symptoms as symptoms,
  'waiting'::text as status,
  'Normal'::text as priority,
  cr.provider_type as provider_type,
  now() as consultation_date,
  cr.id as consultation_request_id,
  now() as created_at,
  now() as updated_at
FROM public.consultation_requests cr
WHERE cr.status = 'approved'
  AND cr.patient_record_id IS NOT NULL
LIMIT 4;

-- Demo completed consultations for history
INSERT INTO public.consultations (
  id,
  patient_id,
  chief_complaint,
  symptoms,
  assessment,
  diagnosis,
  treatment,
  status,
  priority,
  provider_type,
  consultation_date,
  created_at,
  updated_at
) SELECT
  gen_random_uuid() as id,
  pr.id as patient_id,
  CASE 
    WHEN random() > 0.7 THEN 'Routine checkup'
    WHEN random() > 0.4 THEN 'Consultation for body aches'
    ELSE 'Dental examination'
  END as chief_complaint,
  CASE
    WHEN random() > 0.6 THEN 'No acute symptoms'
    WHEN random() > 0.3 THEN 'Mild musculoskeletal pain'
    ELSE 'Tooth sensitivity'
  END as symptoms,
  CASE
    WHEN random() > 0.6 THEN 'Patient appears well, vitals normal'
    WHEN random() > 0.3 THEN 'Good health status, minor concerns noted'
    ELSE 'Dental health generally good'
  END as assessment,
  CASE
    WHEN random() > 0.6 THEN 'Healthy, no abnormalities detected'
    WHEN random() > 0.3 THEN 'Mild muscle tension'
    ELSE 'Slight tooth decay, preventive care recommended'
  END as diagnosis,
  CASE
    WHEN random() > 0.6 THEN 'Continue current lifestyle, rest as needed'
    WHEN random() > 0.3 THEN 'Physical therapy exercises recommended'
    ELSE 'Improved oral hygiene, schedule follow-up in 6 months'
  END as treatment,
  'completed'::text as status,
  'Normal'::text as priority,
  CASE WHEN random() > 0.5 THEN 'physician' ELSE 'dentist' END as provider_type,
  (now() - (random() * INTERVAL '30 days'))::date at time zone 'Asia/Manila' as consultation_date,
  now() - (random() * INTERVAL '30 days') as created_at,
  now() - (random() * INTERVAL '30 days') as updated_at
FROM public.patient_records pr
WHERE pr.student_id IS NOT NULL
  AND pr.created_at > now() - INTERVAL '60 days'
LIMIT 6;

-- Optionally add more varied demo consultation records
INSERT INTO public.consultations (
  id,
  patient_id,
  chief_complaint,
  symptoms,
  assessment,
  diagnosis,
  status,
  priority,
  provider_type,
  consultation_date,
  created_at,
  updated_at
) SELECT
  gen_random_uuid() as id,
  pr.id as patient_id,
  'Eye strain from studying' as chief_complaint,
  'Tired eyes, occasional headaches' as symptoms,
  'Eye examination shows minor strain' as assessment,
  'Digital eye strain' as diagnosis,
  'ongoing'::text as status,
  CASE WHEN random() > 0.7 THEN 'High' ELSE 'Normal' END as priority,
  'physician'::text as provider_type,
  now() as consultation_date,
  now() - INTERVAL '2 hours' as created_at,
  now() as updated_at
FROM public.patient_records pr
WHERE pr.student_id IS NOT NULL
LIMIT 1;

-- Demonstrate the consultation workflow is working
-- This ensures the data relationships are properly established
COMMIT;
