-- Run against the app database; all test profile edits are rolled back.
BEGIN;
DO $$
DECLARE
  admin_id uuid;
  seller public.profiles%ROWTYPE;
  saved jsonb;
  blocked boolean;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'pap_admin' LIMIT 1;
  SELECT * INTO seller FROM public.profiles p WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id
  ) AND public.normalize_phone(p.phone) ~ '^[17][0-9]{8}$' LIMIT 1;
  IF admin_id IS NULL OR seller.id IS NULL THEN RAISE EXCEPTION 'Admin and seller fixtures are required'; END IF;

  -- Sellers may not edit another seller through the admin action.
  PERFORM set_config('request.jwt.claim.sub', seller.id::text, true);
  blocked := false;
  BEGIN
    PERFORM public.admin_update_seller_profile(seller.id, to_jsonb(seller));
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Seller was allowed to use admin editing'; END IF;

  -- Staff without an admin grant may not use the admin action either.
  INSERT INTO public.user_roles(user_id, role) VALUES (seller.id, 'pap_staff');
  PERFORM set_config('request.jwt.claim.sub', seller.id::text, true);
  blocked := false;
  BEGIN
    PERFORM public.admin_update_seller_profile(seller.id, to_jsonb(seller));
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Non-admin was allowed to use admin editing'; END IF;
  DELETE FROM public.user_roles WHERE user_id = seller.id AND role = 'pap_staff';

  -- An admin can edit profile fields, but cannot change roles or order codes.
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  saved := public.admin_update_seller_profile(seller.id, to_jsonb(seller) ||
    jsonb_build_object('owner_name', 'Profile edit test', 'role', 'pap_admin', 'order_link_code', 'changed'));
  IF saved->>'owner_name' <> 'Profile edit test' THEN RAISE EXCEPTION 'Admin profile edit failed'; END IF;
  IF saved->>'role' IS DISTINCT FROM seller.role THEN RAISE EXCEPTION 'Role changed through profile editing'; END IF;
  IF saved->>'order_link_code' IS DISTINCT FROM seller.order_link_code THEN RAISE EXCEPTION 'Order code changed through profile editing'; END IF;

  -- Existing courier/private photo paths cannot be assigned as profile pictures.
  blocked := false;
  BEGIN
    PERFORM public.admin_update_seller_profile(seller.id, to_jsonb(seller) ||
      jsonb_build_object('profile_picture_url', 'receipts/private-photo.jpg'));
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Unowned receipt accepted as profile picture'; END IF;
END;
$$;
ROLLBACK;