CREATE OR REPLACE FUNCTION public.grant_super_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) IN ('ebosoh@gmail.com','omungahudson@gmail.com') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'pap_admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;