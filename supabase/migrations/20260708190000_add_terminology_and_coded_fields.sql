-- supabase/migrations/20260708190000_add_terminology_and_coded_fields.sql
-- Add terminology table, coded fields, validation triggers, indexes and seeds
-- Run as one migration; test in a staging DB before production.

-- ===== 1) Terminology table (local copy / curated subset) =====
CREATE TABLE IF NOT EXISTS public.terminology_codes (
  system text NOT NULL,
  code text NOT NULL,
  display text,
  version text,
  PRIMARY KEY (system, code)
);

GRANT SELECT ON public.terminology_codes TO anon, authenticated;
GRANT ALL   ON public.terminology_codes TO service_role;
ALTER TABLE public.terminology_codes ENABLE ROW LEVEL SECURITY;

-- Allow only these two systems in the local table by default (customize if needed)
ALTER TABLE public.terminology_codes
  ADD CONSTRAINT IF NOT EXISTS terminology_system_check
  CHECK (system IN ('ICD-10', 'SNOMED-CT'));

-- Provide a permissive read policy so UI can query codes
CREATE POLICY IF NOT EXISTS "Public can read terminology codes"
  ON public.terminology_codes FOR SELECT
  TO anon, authenticated
  USING (true);

-- ===== 2) Seed a small starter set of codes =====
-- Replace/extend these rows with your preferred seed or sync/import process.
INSERT INTO public.terminology_codes (system, code, display, version) VALUES
  ('ICD-10', 'E11', 'Type 2 diabetes mellitus', 'ICD-10-2023'),
  ('ICD-10', 'J06.9', 'Acute upper respiratory infection, unspecified', 'ICD-10-2023'),
  ('ICD-10', 'R50.9', 'Fever, unspecified', 'ICD-10-2023'),
  ('SNOMED-CT', '44054006', 'Diabetes mellitus type 2 (disorder)', 'SNOMEDCT'),
  ('SNOMED-CT', '386661006', 'Fever (finding)', 'SNOMEDCT'),
  ('SNOMED-CT', '49727002', 'Cough (finding)', 'SNOMEDCT')
ON CONFLICT (system, code) DO NOTHING;

-- ===== 3) Add coded columns to consultations (primary + array for multiple) =====
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS diagnosis_system text,
  ADD COLUMN IF NOT EXISTS diagnosis_code text,
  ADD COLUMN IF NOT EXISTS diagnosis_display text,
  ADD COLUMN IF NOT EXISTS diagnosis_coded jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS symptom_coded jsonb DEFAULT '[]'::jsonb;

-- FK for the primary diagnosis (enforces single-coded primary entry exists in terminology_codes)
ALTER TABLE public.consultations
  ADD CONSTRAINT IF NOT EXISTS consultations_diagnosis_fk
  FOREIGN KEY (diagnosis_system, diagnosis_code)
  REFERENCES public.terminology_codes (system, code);

-- ===== 4) Add coded columns to lab_orders (results) =====
ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS result_system text,
  ADD COLUMN IF NOT EXISTS result_code text,
  ADD COLUMN IF NOT EXISTS result_display text,
  ADD COLUMN IF NOT EXISTS result_coded jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.lab_orders
  ADD CONSTRAINT IF NOT EXISTS lab_orders_result_fk
  FOREIGN KEY (result_system, result_code)
  REFERENCES public.terminology_codes (system, code);

-- ===== 5) Add observation-coded field to vitals (JSONB array for multiple coded observations) =====
ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS observation_coded jsonb DEFAULT '[]'::jsonb;

-- ===== 6) Validation trigger functions for JSONB-coded arrays =====
-- validate_consultations_coded: checks diagnosis_coded and symptom_coded
CREATE OR REPLACE FUNCTION public.validate_consultations_coded()
RETURNS TRIGGER AS $$
DECLARE
  elem jsonb;
  s text;
  c text;
BEGIN
  -- Validate diagnosis_coded array
  IF (NEW.diagnosis_coded IS NOT NULL) THEN
    IF jsonb_typeof(NEW.diagnosis_coded) <> 'array' THEN
      RAISE EXCEPTION 'diagnosis_coded must be a JSON array';
    END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.diagnosis_coded)
    LOOP
      s := elem ->> 'system';
      c := elem ->> 'code';
      IF s IS NULL OR c IS NULL THEN
        RAISE EXCEPTION 'each diagnosis_coded element must include system and code: %', elem;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.terminology_codes t WHERE t.system = s AND t.code = c
      ) THEN
        RAISE EXCEPTION 'diagnosis_coded contains unknown code %:%', s, c;
      END IF;
    END LOOP;
  END IF;

  -- Validate symptom_coded array
  IF (NEW.symptom_coded IS NOT NULL) THEN
    IF jsonb_typeof(NEW.symptom_coded) <> 'array' THEN
      RAISE EXCEPTION 'symptom_coded must be a JSON array';
    END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.symptom_coded)
    LOOP
      s := elem ->> 'system';
      c := elem ->> 'code';
      IF s IS NULL OR c IS NULL THEN
        RAISE EXCEPTION 'each symptom_coded element must include system and code: %', elem;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.terminology_codes t WHERE t.system = s AND t.code = c
      ) THEN
        RAISE EXCEPTION 'symptom_coded contains unknown code %:%', s, c;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- validate_lab_orders_coded: checks result_coded
CREATE OR REPLACE FUNCTION public.validate_lab_orders_coded()
RETURNS TRIGGER AS $$
DECLARE
  elem jsonb;
  s text;
  c text;
BEGIN
  IF (NEW.result_coded IS NOT NULL) THEN
    IF jsonb_typeof(NEW.result_coded) <> 'array' THEN
      RAISE EXCEPTION 'result_coded must be a JSON array';
    END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.result_coded)
    LOOP
      s := elem ->> 'system';
      c := elem ->> 'code';
      IF s IS NULL OR c IS NULL THEN
        RAISE EXCEPTION 'each result_coded element must include system and code: %', elem;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.terminology_codes t WHERE t.system = s AND t.code = c
      ) THEN
        RAISE EXCEPTION 'result_coded contains unknown code %:%', s, c;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- validate_vitals_coded: checks observation_coded
CREATE OR REPLACE FUNCTION public.validate_vitals_coded()
RETURNS TRIGGER AS $$
DECLARE
  elem jsonb;
  s text;
  c text;
BEGIN
  IF (NEW.observation_coded IS NOT NULL) THEN
    IF jsonb_typeof(NEW.observation_coded) <> 'array' THEN
      RAISE EXCEPTION 'observation_coded must be a JSON array';
    END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.observation_coded)
    LOOP
      s := elem ->> 'system';
      c := elem ->> 'code';
      IF s IS NULL OR c IS NULL THEN
        RAISE EXCEPTION 'each observation_coded element must include system and code: %', elem;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.terminology_codes t WHERE t.system = s AND t.code = c
      ) THEN
        RAISE EXCEPTION 'observation_coded contains unknown code %:%', s, c;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===== 7) Attach triggers to validate before insert/update =====
DROP TRIGGER IF EXISTS trg_consultations_validate_coded ON public.consultations;
CREATE TRIGGER trg_consultations_validate_coded
  BEFORE INSERT OR UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.validate_consultations_coded();

DROP TRIGGER IF EXISTS trg_lab_orders_validate_coded ON public.lab_orders;
CREATE TRIGGER trg_lab_orders_validate_coded
  BEFORE INSERT OR UPDATE ON public.lab_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_lab_orders_coded();

DROP TRIGGER IF EXISTS trg_vitals_validate_coded ON public.vitals;
CREATE TRIGGER trg_vitals_validate_coded
  BEFORE INSERT OR UPDATE ON public.vitals
  FOR EACH ROW EXECUTE FUNCTION public.validate_vitals_coded();

-- ===== 8) Indexes to support autocomplete & lookups =====
CREATE INDEX IF NOT EXISTS idx_terminology_codes_system_display ON public.terminology_codes (system, lower(display));
CREATE INDEX IF NOT EXISTS idx_consultations_primary_diag ON public.consultations (diagnosis_system, diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_lab_orders_result ON public.lab_orders (result_system, result_code);
CREATE INDEX IF NOT EXISTS idx_vitals_observation_coded_gin ON public.vitals USING gin (observation_coded jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_consultations_diagnosis_coded_gin ON public.consultations USING gin (diagnosis_coded jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_lab_orders_result_coded_gin ON public.lab_orders USING gin (result_coded jsonb_path_ops);

-- ===== 9) Update updated_at trigger coverage (if needed) =====
-- If you use the existing update_updated_at_column() trigger, ensure consultations, lab_orders, vitals updated_at are already covered.

-- ===== 10) Usage notes (no-op statements to guide future automation) =====
-- You can now:
--  - Use the terminology_codes table as the authoritative local source for codes.
--  - Query /api/terminology/search?system=SNOMED-CT&q=fever to return matches from terminology_codes.
--  - When saving consultations, set diagnosis_system/diagnosis_code for the primary coded diagnosis (FK enforced)
--  - Use diagnosis_coded / symptom_coded / result_coded / observation_coded JSONB arrays to store multiple coded entries; triggers will validate contents.

-- ===== 11) Cleanup & minor final grants (optional) =====
-- Give authenticated users ability to SELECT terminology codes (already granted). If you want authenticated to insert/update codes, add a policy (not added here to avoid accidental changes).
-- Example (if you want admins to insert):
-- CREATE POLICY "Admins insert terms" ON public.terminology_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== 12) Important notes / next steps =====
--  - SNOMED CT is licensed. Ensure you have rights to import and distribute SNOMED content.
--  - For full SNOMED or ICD imports, consider a separate import process that bulk-inserts into terminology_codes or a dedicated schema/table optimized for full terminologies.
--  - To avoid storing entire terminologies, implement a proxy endpoint that queries a terminology server (SNOMED server, WHO ICD API, or an internal terminology microservice) and store only frequently used codes locally.
--  - Implement a server-side terminology search endpoint (e.g., /api/terminology/search) that queries terminology_codes (with ILIKE on display/code) and returns matches for the UI autocomplete.
--  - Add a CodeSelector UI component that calls that endpoint and writes chosen {system, code, display} to the consultation/lab_order forms.
--  - Implement FHIR mapping endpoints (read-only GETs first) that map your patients -> FHIR Patient, consultations -> FHIR Encounter, vitals/lab_orders -> FHIR Observation and a Bundle endpoint. I can generate TypeScript route skeletons for those next.

COMMIT;
