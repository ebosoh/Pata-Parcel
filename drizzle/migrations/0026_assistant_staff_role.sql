-- Add assistant_staff to public.app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant_staff';

-- Update sync_profile_role trigger function to handle assistant_staff
CREATE OR REPLACE FUNCTION public.sync_profile_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.profiles SET role = COALESCE(
    (SELECT CASE
       WHEN bool_or(role='pap_admin') THEN 'pap_admin'
       WHEN bool_or(role='pap_staff') THEN 'pap_staff'
       WHEN bool_or(role='assistant_staff') THEN 'assistant_staff'
       ELSE 'seller'
     END FROM public.user_roles WHERE user_id = _uid HAVING count(*) > 0),
    'seller') WHERE id = _uid;
  RETURN NULL;
END $$;
