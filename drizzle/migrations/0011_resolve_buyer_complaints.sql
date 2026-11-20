CREATE FUNCTION public.resolve_buyer_complaint(p_complaint_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.complaints
     SET status = 'resolved', resolved_at = now()
   WHERE id = p_complaint_id
     AND status IN ('open', 'investigating')
     AND (seller_id = caller_id OR public.is_pap_staff(caller_id));
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_buyer_complaint(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_buyer_complaint(uuid) TO authenticated;