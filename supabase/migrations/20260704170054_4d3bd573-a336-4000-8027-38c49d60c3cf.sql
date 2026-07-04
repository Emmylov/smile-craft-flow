
-- ===== ENUM =====
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'reception');

-- ===== UPDATED_AT TRIGGER FN =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== HOSPITALS =====
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text UNIQUE NOT NULL,
  access_key text NOT NULL,
  name text NOT NULL,
  hospital_type text,
  address text,
  city text,
  country text,
  state text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT SELECT ON public.hospitals TO anon;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  department_id uuid,
  online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== SECURITY DEFINER HELPERS (after referenced tables exist) =====
CREATE OR REPLACE FUNCTION public.get_my_hospital_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ===== DEPARTMENTS =====
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- ===== PATIENTS =====
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_code text NOT NULL,
  full_name text NOT NULL,
  date_of_birth date,
  gender text,
  address text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  allergies text,
  chronic_illnesses text,
  medications text,
  insurance_provider text,
  insurance_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- ===== VITALS =====
CREATE TABLE public.vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  blood_pressure text,
  heart_rate integer,
  oxygen_saturation integer,
  respiratory_rate integer,
  temperature numeric,
  weight numeric,
  height numeric,
  urgency text NOT NULL DEFAULT 'routine',
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

-- ===== QUEUE ENTRIES =====
CREATE TABLE public.queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_doctor uuid,
  status text NOT NULL DEFAULT 'checked_in',
  urgency text NOT NULL DEFAULT 'routine',
  notes text,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_entries TO authenticated;
GRANT ALL ON public.queue_entries TO service_role;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- ===== APPOINTMENTS =====
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ===== CONSULTATIONS =====
CREATE TABLE public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid,
  complaint text,
  diagnosis text,
  notes text,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- ===== PRESCRIPTIONS =====
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  prescribed_by uuid,
  medication text NOT NULL,
  dosage text,
  instructions text,
  status text NOT NULL DEFAULT 'preparing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- ===== LAB ORDERS =====
CREATE TABLE public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  ordered_by uuid,
  test_name text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  results text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_orders TO authenticated;
GRANT ALL ON public.lab_orders TO service_role;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

-- ===== REFERRALS =====
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  referred_by uuid,
  target_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  target_specialist text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ===== PUBLIC HOSPITAL DIRECTORY (safe columns only) =====
CREATE VIEW public.hospital_directory
WITH (security_invoker = on) AS
  SELECT id, name, hospital_type, city, state, country, created_at
  FROM public.hospitals;
GRANT SELECT ON public.hospital_directory TO anon, authenticated;

-- ===== RLS POLICIES =====
CREATE POLICY "Public can view hospital directory basics"
  ON public.hospitals FOR SELECT TO anon USING (true);
CREATE POLICY "Members can view their hospital"
  ON public.hospitals FOR SELECT TO authenticated
  USING (id = public.get_my_hospital_id());
CREATE POLICY "Admins can update their hospital"
  ON public.hospitals FOR UPDATE TO authenticated
  USING (id = public.get_my_hospital_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view profiles in their hospital"
  ON public.profiles FOR SELECT TO authenticated
  USING (hospital_id = public.get_my_hospital_id());
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can insert profiles in their hospital"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (hospital_id = public.get_my_hospital_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view roles in their hospital"
  ON public.user_roles FOR SELECT TO authenticated
  USING (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage departments in their hospital"
  ON public.departments FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage patients in their hospital"
  ON public.patients FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage vitals in their hospital"
  ON public.vitals FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage queue in their hospital"
  ON public.queue_entries FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage appointments in their hospital"
  ON public.appointments FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage consultations in their hospital"
  ON public.consultations FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage prescriptions in their hospital"
  ON public.prescriptions FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage lab orders in their hospital"
  ON public.lab_orders FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage referrals in their hospital"
  ON public.referrals FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

CREATE POLICY "Members manage notifications in their hospital"
  ON public.notifications FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id())
  WITH CHECK (hospital_id = public.get_my_hospital_id());

-- ===== UPDATED_AT TRIGGERS =====
CREATE TRIGGER trg_hospitals_updated BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_queue_updated BEFORE UPDATE ON public.queue_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_consultations_updated BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prescriptions_updated BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lab_orders_updated BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== REALTIME =====
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.vitals REPLICA IDENTITY FULL;
ALTER TABLE public.prescriptions REPLICA IDENTITY FULL;
ALTER TABLE public.lab_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_orders;
