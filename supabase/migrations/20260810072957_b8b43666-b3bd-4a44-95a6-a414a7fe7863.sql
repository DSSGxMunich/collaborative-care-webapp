CREATE TYPE public.app_role AS ENUM ('patient', 'gp');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practices TO authenticated;
GRANT ALL ON public.practices TO service_role;
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gp manages own practice" ON public.practices FOR ALL TO authenticated
  USING (auth.uid() = gp_id) WITH CHECK (auth.uid() = gp_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "gp reads own patients" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.practices pr WHERE pr.id = profiles.practice_id AND pr.gp_id = auth.uid()));

CREATE POLICY "members read their practice" ON public.practices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.practice_id = practices.id));

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  phq_total integer NOT NULL,
  risk text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessments_patient_created_idx ON public.assessments (patient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient manages own assessments" ON public.assessments FOR ALL TO authenticated
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "gp reads patient assessments" ON public.assessments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.practices pr ON pr.id = p.practice_id
    WHERE p.id = assessments.patient_id AND pr.gp_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.join_practice(_code text)
RETURNS TABLE (practice_id uuid, practice_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _practice public.practices;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT * INTO _practice FROM public.practices
    WHERE upper(code) = upper(btrim(_code)) LIMIT 1;
  IF _practice.id IS NULL THEN
    RAISE EXCEPTION 'invalid practice code';
  END IF;
  UPDATE public.profiles SET practice_id = _practice.id, updated_at = now()
    WHERE id = auth.uid();
  RETURN QUERY SELECT _practice.id, _practice.name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_practice(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();