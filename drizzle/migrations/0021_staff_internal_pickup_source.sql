ALTER TABLE public.parcels DROP CONSTRAINT IF EXISTS parcels_order_source_check;
ALTER TABLE public.parcels ADD CONSTRAINT parcels_order_source_check CHECK (order_source IN ('seller','buyer_link','staff'));

UPDATE public.parcels p SET order_source = 'staff'
WHERE p.order_source = 'seller' AND EXISTS (
  SELECT 1 FROM public.parcel_tracking t
  WHERE t.parcel_id = p.id AND t.notes LIKE 'Dispatch created directly by PAP staff%');

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
 INSERT INTO public.parcels(seller_id,buyer_name,buyer_phone,destination,sending_method,psv_sacco,pick_point,package_type,package_description,num_packages,sending_fee_per_package,total_sending_fee,payment_status,tracking_status,goods_amount,payment_code,goods_paid,order_source)
 VALUES(auth.uid(),trim(_input->>'buyer_name'),trim(_input->>'buyer_phone'),trim(_input->>'destination'),v_method,
 CASE WHEN v_method IN ('psv','psv_driver') THEN nullif(trim(_input->>'psv_sacco'),'') END,
 CASE WHEN v_method = 'door_to_door' THEN nullif(trim(_input->>'pick_point'),'') END,
 trim(_input->>'package_type'),nullif(trim(_input->>'package_description'),''),1,
 CASE WHEN v_method = 'psv_driver' THEN 0 ELSE v_fee END,CASE WHEN v_method = 'psv_driver' THEN 0 ELSE v_fee END,
 CASE WHEN v_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,'awaiting_verification',(_input->>'goods_amount')::numeric,
 nullif(upper(trim(_input->>'payment_code')),''),false,v_source) RETURNING * INTO v_parcel;
 IF v_parcel.id IS NULL THEN RETURN jsonb_build_object('error',coalesce(nullif(current_setting('app.payment_rejection',true),''),'Order could not be created')); END IF;
 RETURN jsonb_build_object('parcel',to_jsonb(v_parcel));
END $$;
REVOKE ALL ON FUNCTION public.seller_create_parcel(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_create_parcel(jsonb) TO authenticated,service_role;