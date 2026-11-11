CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Keep profiles.role in sync with granted roles (display/routing only)
CREATE OR REPLACE FUNCTION public.sync_profile_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.profiles SET role = COALESCE(
    (SELECT CASE WHEN bool_or(role='pap_admin') THEN 'pap_admin' ELSE 'pap_staff' END FROM public.user_roles WHERE user_id = _uid HAVING count(*) > 0),
    'seller') WHERE id = _uid;
  RETURN NULL;
END $$;
CREATE TRIGGER sync_profile_role AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();

-- Super admins are granted automatically on signup
CREATE OR REPLACE FUNCTION public.grant_super_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) IN ('hudson.eboso@techbrain.africa','omungahudson@gmail.com') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'pap_admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_grant_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin();

CREATE OR REPLACE FUNCTION public.admin_list_staff() RETURNS TABLE(user_id uuid, email text, owner_name text, role public.app_role) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'pap_admin') THEN RAISE EXCEPTION 'Only admins can view staff'; END IF;
  RETURN QUERY SELECT r.user_id, u.email::text, COALESCE(p.owner_name,''), r.role
    FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id LEFT JOIN public.profiles p ON p.id = r.user_id ORDER BY u.email;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_staff_role(_email text, _role public.app_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'pap_admin') THEN RAISE EXCEPTION 'Only admins can manage staff'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _uid IS NULL THEN RAISE EXCEPTION 'No account found for this email. Ask them to sign up first.'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, _role);
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_staff(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'pap_admin') THEN RAISE EXCEPTION 'Only admins can manage staff'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_staff(), public.admin_set_staff_role(text, public.app_role), public.admin_remove_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_staff(), public.admin_set_staff_role(text, public.app_role), public.admin_remove_staff(uuid) TO authenticated;

-- Private receipts bucket: only parcel owner or staff can read
DROP POLICY IF EXISTS "Public read receipts" ON storage.objects;
CREATE POLICY "Signed-in read receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts');