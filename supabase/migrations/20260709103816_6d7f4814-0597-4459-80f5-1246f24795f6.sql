
-- Ensure pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Reference table
CREATE TABLE IF NOT EXISTS public.terminology_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system text NOT NULL,
  code text NOT NULL,
  display text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system, code),
  CHECK (system IN ('ICD-10','SNOMED-CT','LOINC','RxNorm'))
);

GRANT SELECT ON public.terminology_codes TO authenticated;
GRANT ALL ON public.terminology_codes TO service_role;
ALTER TABLE public.terminology_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terminology readable by authenticated" ON public.terminology_codes;
CREATE POLICY "terminology readable by authenticated"
  ON public.terminology_codes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "terminology writable by admin" ON public.terminology_codes;
CREATE POLICY "terminology writable by admin"
  ON public.terminology_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS terminology_display_trgm ON public.terminology_codes USING gin (display gin_trgm_ops);
CREATE INDEX IF NOT EXISTS terminology_code_trgm ON public.terminology_codes USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS terminology_system_idx ON public.terminology_codes (system);

-- 2. Coded columns on clinical tables
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS diagnosis_system text,
  ADD COLUMN IF NOT EXISTS diagnosis_code text,
  ADD COLUMN IF NOT EXISTS diagnosis_display text;

ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_diagnosis_system_check;
ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_diagnosis_system_check
  CHECK (diagnosis_system IS NULL OR diagnosis_system IN ('ICD-10','SNOMED-CT'));

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS test_system text,
  ADD COLUMN IF NOT EXISTS test_code text,
  ADD COLUMN IF NOT EXISTS test_display text,
  ADD COLUMN IF NOT EXISTS result_system text,
  ADD COLUMN IF NOT EXISTS result_code text,
  ADD COLUMN IF NOT EXISTS result_display text;

ALTER TABLE public.lab_orders
  DROP CONSTRAINT IF EXISTS lab_orders_test_system_check;
ALTER TABLE public.lab_orders
  ADD CONSTRAINT lab_orders_test_system_check
  CHECK (test_system IS NULL OR test_system IN ('LOINC','SNOMED-CT'));
ALTER TABLE public.lab_orders
  DROP CONSTRAINT IF EXISTS lab_orders_result_system_check;
ALTER TABLE public.lab_orders
  ADD CONSTRAINT lab_orders_result_system_check
  CHECK (result_system IS NULL OR result_system IN ('LOINC','SNOMED-CT','ICD-10'));

ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS observation_coded jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS medication_system text,
  ADD COLUMN IF NOT EXISTS medication_code text,
  ADD COLUMN IF NOT EXISTS medication_display text;

ALTER TABLE public.prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_medication_system_check;
ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_medication_system_check
  CHECK (medication_system IS NULL OR medication_system IN ('RxNorm','SNOMED-CT'));

-- 3. Small starter seed (safe to re-run)
INSERT INTO public.terminology_codes (system, code, display) VALUES
  ('ICD-10','J06.9','Acute upper respiratory infection, unspecified'),
  ('ICD-10','E11.9','Type 2 diabetes mellitus without complications'),
  ('ICD-10','I10','Essential (primary) hypertension'),
  ('ICD-10','J45.909','Unspecified asthma, uncomplicated'),
  ('ICD-10','R50.9','Fever, unspecified'),
  ('ICD-10','R05','Cough'),
  ('ICD-10','K59.00','Constipation, unspecified'),
  ('ICD-10','B54','Unspecified malaria'),
  ('SNOMED-CT','386661006','Fever'),
  ('SNOMED-CT','49727002','Cough'),
  ('SNOMED-CT','25064002','Headache'),
  ('SNOMED-CT','422587007','Nausea'),
  ('SNOMED-CT','267036007','Dyspnea'),
  ('SNOMED-CT','62315008','Diarrhea'),
  ('SNOMED-CT','271807003','Rash'),
  ('SNOMED-CT','29857009','Chest pain'),
  ('LOINC','718-7','Hemoglobin [Mass/volume] in Blood'),
  ('LOINC','2345-7','Glucose [Mass/volume] in Serum or Plasma'),
  ('LOINC','2160-0','Creatinine [Mass/volume] in Serum or Plasma'),
  ('LOINC','6690-2','Leukocytes [#/volume] in Blood by Automated count'),
  ('LOINC','777-3','Platelets [#/volume] in Blood by Automated count'),
  ('LOINC','4548-4','Hemoglobin A1c/Hemoglobin.total in Blood'),
  ('RxNorm','197361','Amoxicillin 500 MG Oral Capsule'),
  ('RxNorm','310965','Ibuprofen 200 MG Oral Tablet'),
  ('RxNorm','313782','Acetaminophen 500 MG Oral Tablet'),
  ('RxNorm','860975','Metformin hydrochloride 500 MG Oral Tablet'),
  ('RxNorm','197884','Lisinopril 10 MG Oral Tablet')
ON CONFLICT (system, code) DO NOTHING;
