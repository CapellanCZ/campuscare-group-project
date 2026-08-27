-- Printed was a transient workflow state; documents remain issued after printing.
UPDATE public.medical_certificates
SET status = 'issued', updated_at = now()
WHERE status = 'printed';
