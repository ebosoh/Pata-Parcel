CREATE OR REPLACE FUNCTION public.submit_buyer_order(_code text, _buyer_name text, _buyer_phone text, _destination text, _sending_method text, _psv_sacco text, _pick_point text, _package_type text, _package_description text, _sending_fee numeric, _goods_amount numeric, _payment_code text)
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
 IF coalesce(_goods_amount, -1) < 0 OR _goods_amount > 10000000 THEN RAISE EXCEPTION 'Please enter the amount you paid'; END IF;
 IF _pay IS NOT NULL AND _pay !~ '^[A-Z0-9]{6,20}$' THEN RAISE EXCEPTION 'Please enter a valid M-Pesa / Airtel Money code'; END IF;
 IF length(coalesce(_package_description,'')) > 500 OR length(coalesce(_package_type,'')) > 300 THEN RAISE EXCEPTION 'Description is too long'; END IF;
 INSERT INTO public.parcels(seller_id,buyer_name,buyer_phone,destination,sending_method,psv_sacco,pick_point,package_type,package_description,num_packages,sending_fee_per_package,total_sending_fee,payment_status,tracking_status,goods_amount,payment_code,goods_paid,order_source)
 VALUES(_seller,trim(_buyer_name),_phone,trim(_destination),_sending_method,
 CASE WHEN _sending_method IN ('psv','psv_driver') THEN nullif(trim(_psv_sacco),'') END,
 CASE WHEN _sending_method = 'door_to_door' THEN nullif(trim(_pick_point),'') END,
 coalesce(nullif(trim(_package_type),''),'Other'),nullif(trim(_package_description),''),1,
 CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
 CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
 CASE WHEN _sending_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,
 'awaiting_verification',_goods_amount,_pay,false,'buyer_link') RETURNING reference_number INTO _ref;
 IF _ref IS NULL THEN RETURN 'PAYMENT_REJECTED:' || coalesce(nullif(current_setting('app.payment_rejection',true),''),'Order could not be created'); END IF;
 RETURN _ref;
END $function$;