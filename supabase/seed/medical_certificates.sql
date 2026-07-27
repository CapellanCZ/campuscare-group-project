-- Seed sample medical certificates for local/dev demos.
-- Safe to re-run: deletes prior seed rows by certificate_number prefix MC-SEED-.
-- Requires existing rows in public.patients.

DELETE FROM public.medical_certificates
WHERE certificate_number LIKE 'MC-SEED-%';

INSERT INTO public.medical_certificates (
  patient_id,
  certificate_number,
  certificate_type,
  purpose,
  doctor_name,
  remarks,
  status,
  issued_at,
  valid_until
)
SELECT
  p.id,
  seed.certificate_number,
  seed.certificate_type,
  seed.purpose,
  seed.doctor_name,
  seed.remarks,
  seed.status,
  seed.issued_at,
  seed.valid_until
FROM (
  VALUES
    (
      '2021-04521',
      'MC-SEED-001',
      'Medical excuse',
      'Absence due to acute gastroenteritis',
      'Dr. Ramon Villanueva',
      'Rest recommended for 3 days.',
      'issued',
      timestamptz '2026-07-25 08:55:00+08',
      date '2026-07-28'
    ),
    (
      '2022-00311',
      'MC-SEED-002',
      'Fitness for internship',
      'Clearance for off-campus internship placement',
      'Dr. Ramon Villanueva',
      'Fit for light-to-moderate physical activity.',
      'issued',
      timestamptz '2026-07-24 10:20:00+08',
      date '2026-10-24'
    ),
    (
      '2019-55201',
      'MC-SEED-003',
      'Medical excuse',
      'Missed classes due to migraine',
      'Dr. Elise Torres',
      NULL,
      'printed',
      timestamptz '2026-07-22 14:10:00+08',
      date '2026-07-29'
    ),
    (
      '2020-11802',
      'MC-SEED-004',
      'Dental clearance',
      'Dental fitness for athletic tryouts',
      'Dr. Elise Torres',
      'Oral exam completed; no active infection.',
      'issued',
      timestamptz '2026-07-20 11:40:00+08',
      date '2026-08-20'
    ),
    (
      '2023-172077',
      'MC-SEED-005',
      'Medical excuse',
      'Pending review of lab results',
      NULL,
      'Awaiting CBC results before issue.',
      'pending',
      NULL,
      NULL
    ),
    (
      'FAC-7781',
      'MC-SEED-006',
      'Fitness for duty',
      'Annual faculty health clearance',
      'Dr. Ramon Villanueva',
      NULL,
      'printed',
      timestamptz '2026-07-18 09:05:00+08',
      date '2027-07-18'
    ),
    (
      '2021-04521',
      'MC-SEED-007',
      'Medical certificate',
      'Request for sports participation clearance',
      NULL,
      'Draft started from consultation notes.',
      'draft',
      NULL,
      NULL
    ),
    (
      '2022-00311',
      'MC-SEED-008',
      'Dental clearance',
      'Clearance prior to orthodontic referral',
      'Dr. Elise Torres',
      'Issued today for registrar copy.',
      'issued',
      date_trunc('day', timezone('Asia/Manila', now()))
        AT TIME ZONE 'Asia/Manila'
        + interval '9 hours',
      (timezone('Asia/Manila', now()))::date + 30
    ),
    (
      '2019-55201',
      'MC-SEED-009',
      'Fitness for internship',
      'Internship medical requirements packet',
      NULL,
      'Patient photos and vitals incomplete.',
      'draft',
      NULL,
      NULL
    ),
    (
      '2020-11802',
      'MC-SEED-010',
      'Medical excuse',
      'Follow-up certificate request from consultation',
      'Dr. Ramon Villanueva',
      'Nurse flagged for physician countersign.',
      'pending',
      NULL,
      NULL
    )
) AS seed (
  student_id,
  certificate_number,
  certificate_type,
  purpose,
  doctor_name,
  remarks,
  status,
  issued_at,
  valid_until
)
INNER JOIN public.patients p
  ON p.student_id = seed.student_id;
