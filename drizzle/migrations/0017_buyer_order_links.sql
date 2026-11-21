ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS order_link_code text NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_order_link_code_key ON public.profiles(order_link_code);

ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS goods_amount numeric;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS payment_code text;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS goods_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'seller';
UPDATE public.parcels SET goods_paid = true WHERE tracking_status <> 'awaiting_verification';

ALTER TABLE public.parcels DROP CONSTRAINT parcels_tracking_status_check;
ALTER TABLE public.parcels ADD CONSTRAINT parcels_tracking_status_check CHECK (tracking_status = ANY (ARRAY['awaiting_verification','dispatched_to_pap','sorting','on_transit','delivered']));
ALTER TABLE public.parcels ADD CONSTRAINT parcels_order_source_check CHECK (order_source IN ('seller','buyer_link'));

CREATE OR REPLACE FUNCTION public.get_order_seller(_code text)
RETURNS TABLE(business_name text, owner_name text, location text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.business_name, p.owner_name, p.location FROM public.profiles p WHERE p.order_link_code = _code LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_order_seller(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_buyer_order(
  _code text, _buyer_name text, _buyer_phone text, _destination text, _sending_method text,
  _psv_sacco text, _pick_point text, _package_type text, _package_description text,
  _sending_fee numeric, _goods_amount numeric, _payment_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seller uuid; _ref text; _phone text;
BEGIN
  SELECT id INTO _seller FROM public.profiles WHERE order_link_code = _code;
  IF _seller IS NULL THEN RAISE EXCEPTION 'This order link is not valid'; END IF;
  _phone := regexp_replace(coalesce(_buyer_phone,''), '\s', '', 'g');
  IF length(trim(coalesce(_buyer_name,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  IF _phone !~ '^(07|01)[0-9]{8}$' THEN RAISE EXCEPTION 'Please enter a valid Kenyan phone number'; END IF;
  IF length(trim(coalesce(_destination,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please choose a destination town'; END IF;
  IF _sending_method NOT IN ('pickup_mtaani','pata_parcel','door_to_door','psv','psv_driver') THEN RAISE EXCEPTION 'Please choose a sending method'; END IF;
  IF _sending_method = 'psv' AND length(trim(coalesce(_psv_sacco,''))) = 0 THEN RAISE EXCEPTION 'Please choose a SACCO'; END IF;
  IF _sending_method = 'door_to_door' AND length(trim(coalesce(_pick_point,''))) = 0 THEN RAISE EXCEPTION 'Please choose a pick-point'; END IF;
  IF coalesce(_goods_amount, -1) < 0 OR _goods_amount > 10000000 THEN RAISE EXCEPTION 'Please enter the amount you paid'; END IF;
  IF length(trim(coalesce(_payment_code,''))) NOT BETWEEN 6 AND 20 THEN RAISE EXCEPTION 'Please enter your M-Pesa / Airtel Money code'; END IF;
  IF length(coalesce(_package_description,'')) > 500 OR length(coalesce(_package_type,'')) > 300 THEN RAISE EXCEPTION 'Description is too long'; END IF;

  INSERT INTO public.parcels (seller_id, buyer_name, buyer_phone, destination, sending_method, psv_sacco, pick_point,
    package_type, package_description, num_packages, sending_fee_per_package, total_sending_fee, payment_status,
    tracking_status, goods_amount, payment_code, goods_paid, order_source)
  VALUES (_seller, trim(_buyer_name), _phone, trim(_destination), _sending_method,
    CASE WHEN _sending_method IN ('psv','psv_driver') THEN nullif(trim(_psv_sacco),'') END,
    CASE WHEN _sending_method = 'door_to_door' THEN nullif(trim(_pick_point),'') END,
    coalesce(nullif(trim(_package_type),''),'Other'), nullif(trim(_package_description),''), 1,
    CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
    CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
    CASE WHEN _sending_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,
    'awaiting_verification', _goods_amount, upper(trim(_payment_code)), false, 'buyer_link')
  RETURNING reference_number INTO _ref;
  RETURN _ref;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_buyer_order(text,text,text,text,text,text,text,text,text,numeric,numeric,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.seller_set_parcel_payment(_parcel_id uuid, _goods_paid boolean, _fee_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _fee_status NOT IN ('paid','pay_on_delivery') THEN RAISE EXCEPTION 'Invalid sending fee status'; END IF;
  UPDATE public.parcels SET goods_paid = _goods_paid, payment_status = _fee_status
  WHERE id = _parcel_id AND (seller_id = auth.uid() OR public.is_pap_staff(auth.uid()));
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcel not found'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.seller_set_parcel_payment(uuid,boolean,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.seller_set_parcel_payment(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.seller_verify_and_dispatch(_parcel_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.parcels SET goods_paid = true, tracking_status = 'dispatched_to_pap'
  WHERE id = _parcel_id AND tracking_status = 'awaiting_verification'
    AND (seller_id = auth.uid() OR public.is_pap_staff(auth.uid()));
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcel not found or already dispatched'; END IF;
  INSERT INTO public.parcel_tracking (parcel_id, status, updated_by, notes)
  VALUES (_parcel_id, 'dispatched_to_pap', auth.uid(), 'Payment verified by seller; dispatched to Pata Parcel');
END $$;
REVOKE EXECUTE ON FUNCTION public.seller_verify_and_dispatch(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.seller_verify_and_dispatch(uuid) TO authenticated;