CREATE OR REPLACE FUNCTION public.bootstrap_account(_role public.app_role, _full_name text, _practice_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _tries int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (_uid, coalesce(btrim(_full_name), ''))
  ON CONFLICT (id) DO UPDATE
    SET full_name = CASE
      WHEN public.profiles.full_name = '' THEN coalesce(btrim(_full_name), '')
      ELSE public.profiles.full_name END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'gp' AND NOT EXISTS (SELECT 1 FROM public.practices WHERE gp_id = _uid) THEN
    LOOP
      _tries := _tries + 1;
      _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.practices WHERE code = _code) OR _tries > 20;
    END LOOP;
    INSERT INTO public.practices (gp_id, name, code)
    VALUES (_uid, coalesce(nullif(btrim(_practice_name), ''), 'Praxis'), _code);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_account(public.app_role, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_account(public.app_role, text, text) TO authenticated;