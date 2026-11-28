-- Add product_image_url column to store the URL of the product screenshot attached at dispatch time
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS product_image_url text;
COMMENT ON COLUMN public.parcels.product_image_url IS 'Optional URL of a product screenshot uploaded by the buyer or seller at dispatch time, stored in the receipts bucket under product-scans/.';

-- Allow anonymous users to upload files to the product-scans/ folder in the receipts bucket.
-- Files are keyed by a UUID so they cannot be guessed.
CREATE POLICY "Anon upload product scans" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = 'product-scans'
    AND cardinality(storage.foldername(name)) = 1
  );

-- Allow the parcel's seller and PAP staff to read linked product scans
CREATE POLICY "Signed-in read product scans" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = 'product-scans'
    AND EXISTS (
      SELECT 1
      FROM public.parcels AS parcel
      WHERE parcel.product_image_url = storage.objects.name
        AND (
          parcel.seller_id = (SELECT auth.uid())
          OR (SELECT public.is_pap_staff(auth.uid()))
        )
    )
  );

-- Update submit_buyer_order to accept and store product_image_url
CREATE OR REPLACE FUNCTION public.submit_buyer_order(
  _code text,
  _buyer_name text,
  _buyer_phone text,
  _destination text,
  _sending_method text,
  _psv_sacco text,
  _pick_point text,
  _package_type text,
  _package_description text,
  _sending_fee numeric,
  _goods_amount numeric,
  _payment_code text,
  _product_image_url text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _seller uuid; _ref text; _phone text; _pay text;
BEGIN
 SELECT id INTO _seller FROM public.profiles WHERE order_link_code = _code;
 IF _seller IS NULL THEN RAISE EXCEPTION 'This order link is not valid'; END IF;
 _phone := regexp_replace(coalesce(_buyer_phone,''), '\s', '', 'g');
 _pay := nullif(upper(trim(coalesce(_payment_code,''))),'');
 IF length(trim(coalesce(_buyer_name,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
 IF _phone !~ '^(07|01)[0-9]{8}$' THEN RAISE EXCEPTION 'Please enter a valid Kenyan phone number'; END IF;
 IF length(trim(coalesce(_destination,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please choose a destination town'; END IF;
 IF _sending_method IS NULL OR _sending_method NOT IN ('pickup_mtaani','pata_parcel','door_to_door','psv','psv_driver') THEN RAISE EXCEPTION 'Please choose a sending method'; END IF;
 IF _sending_method = 'psv' AND length(trim(coalesce(_psv_sacco,''))) = 0 THEN RAISE EXCEPTION 'Please choose a SACCO'; END IF;
 IF _sending_method = 'door_to_door' AND length(trim(coalesce(_pick_point,''))) = 0 THEN RAISE EXCEPTION 'Please choose a pick-point'; END IF;
 IF _pay IS NOT NULL AND _pay !~ '^[A-Z0-9]{6,20}$' THEN RAISE EXCEPTION 'Please enter a valid M-Pesa / Airtel Money code'; END IF;
 IF length(coalesce(_package_description,'')) > 500 OR length(coalesce(_package_type,'')) > 300 THEN RAISE EXCEPTION 'Description is too long'; END IF;
 IF _product_image_url IS NOT NULL AND length(_product_image_url) > 500 THEN RAISE EXCEPTION 'Product image URL is too long'; END IF;
 INSERT INTO public.parcels(seller_id,buyer_name,buyer_phone,destination,sending_method,psv_sacco,pick_point,package_type,package_description,num_packages,sending_fee_per_package,total_sending_fee,payment_status,tracking_status,goods_amount,payment_code,goods_paid,order_source,product_image_url)
 VALUES(_seller,trim(_buyer_name),_phone,trim(_destination),_sending_method,
 CASE WHEN _sending_method IN ('psv','psv_driver') THEN nullif(trim(_psv_sacco),'') END,
 CASE WHEN _sending_method = 'door_to_door' THEN nullif(trim(_pick_point),'') END,
 coalesce(nullif(trim(_package_type),''),'Other'),nullif(trim(_package_description),''),1,
 CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
 CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
 CASE WHEN _sending_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,
 'awaiting_verification',_goods_amount,_pay,false,'buyer_link',nullif(trim(coalesce(_product_image_url,'')),'')))
 RETURNING reference_number INTO _ref;
 IF _ref IS NULL THEN RETURN 'PAYMENT_REJECTED:' || coalesce(nullif(current_setting('app.payment_rejection',true),''),'Order could not be created'); END IF;
 RETURN _ref;
END $function$;

-- Update seller_create_parcel to accept and store product_image_url
CREATE OR REPLACE FUNCTION public.seller_create_parcel(_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parcel public.parcels; v_method text; v_fee numeric; v_source text := 'seller';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to create a dispatch'; END IF;
 IF _input->>'order_source' = 'staff' AND public.is_pap_staff(auth.uid()) THEN v_source := 'staff'; END IF;
 v_method := _input->>'sending_method';
 v_fee := (_input->>'sending_fee')::numeric;
 IF length(trim(coalesce(_input->>'buyer_name',''))) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Please enter the buyer name'; END IF;
 IF length(trim(coalesce(_input->>'destination',''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please select a destination town'; END IF;
 IF v_method IS NULL OR v_method NOT IN ('pickup_mtaani','pata_parcel','door_to_door','psv','psv_driver') THEN RAISE EXCEPTION 'Please choose a sending method'; END IF;
 IF v_method = 'psv' AND nullif(trim(_input->>'psv_sacco'),'') IS NULL THEN RAISE EXCEPTION 'Please choose a SACCO'; END IF;
 IF v_method = 'door_to_door' AND nullif(trim(_input->>'pick_point'),'') IS NULL THEN RAISE EXCEPTION 'Please choose a pick-point'; END IF;
 IF v_fee IS NULL OR v_fee < 0 OR v_fee > 10000000 THEN RAISE EXCEPTION 'Please enter a valid sending fee'; END IF;
 IF coalesce((_input->>'goods_amount')::numeric,0) < 0 OR coalesce((_input->>'goods_amount')::numeric,0) > 10000000 THEN RAISE EXCEPTION 'Please enter a valid goods amount'; END IF;
 IF length(coalesce(_input->>'package_description','')) > 500 OR length(coalesce(_input->>'package_type','')) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Please check the package details'; END IF;
 IF _input->>'product_image_url' IS NOT NULL AND length(_input->>'product_image_url') > 500 THEN RAISE EXCEPTION 'Product image URL is too long'; END IF;
 INSERT INTO public.parcels(seller_id,buyer_name,buyer_phone,destination,sending_method,psv_sacco,pick_point,package_type,package_description,num_packages,sending_fee_per_package,total_sending_fee,payment_status,tracking_status,goods_amount,payment_code,goods_paid,order_source,product_image_url)
 VALUES(auth.uid(),trim(_input->>'buyer_name'),trim(_input->>'buyer_phone'),trim(_input->>'destination'),v_method,
 CASE WHEN v_method IN ('psv','psv_driver') THEN nullif(trim(_input->>'psv_sacco'),'') END,
 CASE WHEN v_method = 'door_to_door' THEN nullif(trim(_input->>'pick_point'),'') END,
 trim(_input->>'package_type'),nullif(trim(_input->>'package_description'),''),1,
 CASE WHEN v_method = 'psv_driver' THEN 0 ELSE v_fee END,CASE WHEN v_method = 'psv_driver' THEN 0 ELSE v_fee END,
 CASE WHEN v_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,'awaiting_verification',(_input->>'goods_amount')::numeric,
 nullif(upper(trim(_input->>'payment_code')),''),false,v_source,nullif(trim(coalesce(_input->>'product_image_url','')),'')))
 RETURNING * INTO v_parcel;
 IF v_parcel.id IS NULL THEN RETURN jsonb_build_object('error',coalesce(nullif(current_setting('app.payment_rejection',true),''),'Order could not be created')); END IF;
 RETURN jsonb_build_object('parcel',to_jsonb(v_parcel));
END $$;
REVOKE ALL ON FUNCTION public.seller_create_parcel(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_create_parcel(jsonb) TO authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.submit_buyer_order(text,text,text,text,text,text,text,text,text,numeric,numeric,text,text) TO anon,authenticated,service_role;
